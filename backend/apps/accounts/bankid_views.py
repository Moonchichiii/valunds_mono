"""
BankID authentication views for Swedish identity verification.

This module implements a separate authentication flow using BankID.
It is kept distinct from the traditional auth and OAuth flows.
"""
import hashlib
import logging
from typing import Any

import requests
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .security_utils import get_client_ip, track_login_attempt
from .views import set_auth_cookies

logger = logging.getLogger(name)


class BankIDInitiateView(APIView):
    """
    Start a BankID authentication session.

    POST /api/accounts/bankid/initiate/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Start BankID authentication. Optionally accept a personal number
        for a faster login flow.
        """
        personal_number = request.data.get('personalNumber')
        ip_address = get_client_ip(request)

        try:
            # Start authentication with BankID API
            bankid_response = self._start_bankid_auth(personal_number, ip_address)

            # Save order reference in session so frontend can poll status
            order_ref = bankid_response['orderRef']
            request.session['bankid_order_ref'] = order_ref

            logger.info(f"BankID auth initiated: {order_ref}")

            return Response({
                'orderRef': order_ref,
                'autoStartToken': bankid_response['autoStartToken'],
                'qrStartToken': bankid_response.get('qrStartToken'),
                'qrStartSecret': bankid_response.get('qrStartSecret'),
            }, status=status.HTTP_200_OK)

        except requests.RequestException as e:
            logger.error(f"BankID initiation failed: {e}")
            return Response(
                {'detail': 'Failed to start BankID authentication'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _start_bankid_auth(self, personal_number: str | None, ip_address: str) -> dict[str, Any]:
        """
        Call the BankID auth endpoint to start an authentication session.

        Docs: https://developers.bankid.com/api-references/auth-sign#auth
        """
        bankid_url = f"{settings.BANKID_API_URL}/auth"

        payload = {'endUserIp': ip_address}
        if personal_number:
            payload['personalNumber'] = personal_number

        response = requests.post(
            bankid_url,
            json=payload,
            cert=(settings.BANKID_CERT_PATH, settings.BANKID_KEY_PATH),
            verify=settings.BANKID_CA_CERT_PATH,
            timeout=10
        )
        response.raise_for_status()

        return response.json()


class BankIDCollectView(APIView):
    """
    Poll BankID for authentication status.

    Frontend typically polls this endpoint repeatedly until completion.
    POST /api/accounts/bankid/collect/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """Check the status of an active BankID authentication."""
        order_ref = request.session.get('bankid_order_ref')

        if not order_ref:
            return Response(
                {'detail': 'No active BankID session'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Query BankID collect endpoint for current status
            result = self._collect_bankid_result(order_ref)

            if result['status'] == 'pending':
                return Response({
                    'status': 'pending',
                    'hintCode': result.get('hintCode'),
                    'message': self._get_user_message(result.get('hintCode'))
                })

            elif result['status'] == 'complete':
                # Authentication succeeded; extract verified identity data
                completion_data = result['completionData']
                user_data = completion_data['user']

                # Create or update a user record using verified BankID data
                user = self._get_or_create_bankid_user(user_data, request)

                # Record successful login attempt
                track_login_attempt(user, request, success=True)

                # Issue JWT tokens for the user
                refresh = RefreshToken.for_user(user)
                tokens = {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token)
                }

                # Clear session state
                del request.session['bankid_order_ref']

                logger.info(f"BankID auth completed for user: {user.email}")

                response = Response({
                    'status': 'complete',
                    'user': {
                        'id': str(user.id),
                        'email': user.email,
                        'first_name': user.first_name,
                        'last_name': user.last_name,
                        'bankid_verified': True
                    },
                    'tokens': tokens
                })

                return set_auth_cookies(response, tokens)

            elif result['status'] == 'failed':
                logger.warning(f"BankID auth failed: {result.get('hintCode')}")
                return Response({
                    'status': 'failed',
                    'message': 'BankID authentication failed'
                }, status=status.HTTP_400_BAD_REQUEST)

        except requests.RequestException as e:
            logger.error(f"BankID collection error: {e}")
            return Response(
                {'detail': 'Failed to collect BankID status'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _collect_bankid_result(self, order_ref: str) -> dict[str, Any]:
        """
        Call BankID collect endpoint to obtain the current authentication status.

        Docs: https://developers.bankid.com/api-references/auth-sign#collect
        """
        bankid_url = f"{settings.BANKID_API_URL}/collect"

        response = requests.post(
            bankid_url,
            json={'orderRef': order_ref},
            cert=(settings.BANKID_CERT_PATH, settings.BANKID_KEY_PATH),
            verify=settings.BANKID_CA_CERT_PATH,
            timeout=10
        )
        response.raise_for_status()

        return response.json()

    def _get_or_create_bankid_user(self, user_data: dict[str, Any], request) -> User:
        """
        Create or update a User record based on verified BankID data.

        The personal number is hashed before storage for privacy and compliance.
        """
        personal_number = user_data['personalNumber']
        given_name = user_data['givenName']
        surname = user_data['surname']

        # Hash the personal number before any storage or lookup
        hashed_pn = self._hash_personal_number(personal_number)

        try:
            user = User.objects.get(bankid_personal_number=hashed_pn)

            # Update user fields based on verified BankID information
            user.bankid_verified = True
            user.bankid_verified_at = timezone.now()
            user.first_name = given_name
            user.last_name = surname
            user.email_verified = True
            user.is_active = True
            user.save(update_fields=[
                'bankid_verified',
                'bankid_verified_at',
                'first_name',
                'last_name',
                'email_verified',
                'is_active'
            ])

            logger.info(f"Existing user updated with BankID: {user.email}")

        except User.DoesNotExist:
            # Create a new user record using hashed identifier to ensure uniqueness
            username = f"bankid_{hashed_pn[:16]}"
            temp_email = f"bankid_{hashed_pn[:16]}@valunds.se"

            user = User.objects.create(
                username=username,
                email=temp_email,
                first_name=given_name,
                last_name=surname,
                is_active=True,
                email_verified=True,  # BankID provides verified identity
                bankid_verified=True,
                bankid_personal_number=hashed_pn,
                bankid_verified_at=timezone.now(),
            )

            logger.info(f"New user created with BankID: {user.email}")

        return user

    def _hash_personal_number(self, personal_number: str) -> str:
        """
        Hash a personal number with a salt before storing or looking it up.

        Note: Do not store raw personal numbers to comply with privacy rules.
        """
        salt = settings.BANKID_SALT
        return hashlib.sha256(f"{salt}{personal_number}".encode()).hexdigest()

    def _get_user_message(self, hint_code: str) -> str:
        """Return a human-friendly message for BankID hint codes."""
        messages = {
            'outstandingTransaction': 'Open your BankID app to complete authentication',
            'noClient': 'BankID app not found. Please install BankID.',
            'started': 'Starting BankID...',
            'userSign': 'Enter your security code in the BankID app',
            'userCancel': 'Authentication cancelled by user',
        }
        return messages.get(hint_code, 'Processing BankID authentication...')


class BankIDCancelView(APIView):
    """
    Cancel an ongoing BankID authentication session.

    POST /api/accounts/bankid/cancel/
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """Cancel an active BankID session and clear session state."""
        order_ref = request.session.get('bankid_order_ref')

        if order_ref:
            try:
                # Notify BankID service to cancel the order
                bankid_url = f"{settings.BANKID_API_URL}/cancel"
                requests.post(
                    bankid_url,
                    json={'orderRef': order_ref},
                    cert=(settings.BANKID_CERT_PATH, settings.BANKID_KEY_PATH),
                    verify=settings.BANKID_CA_CERT_PATH,
                    timeout=5
                )
                logger.info(f"BankID session cancelled: {order_ref}")
            except requests.RequestException as e:
                logger.error(f"Error cancelling BankID: {e}")

            # Remove order reference from session
            del request.session['bankid_order_ref']

        return Response({'detail': 'BankID authentication cancelled'})
