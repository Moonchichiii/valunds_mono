from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "user_type",
            "date_joined",
            "phone_number",
            "address",
            "city",
            "postcode",
            "country",
        ]
        read_only_fields = ["id", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "user_type",
            "phone_number",
            "address",
            "city",
            "postcode",
            "country",
        ]
        extra_kwargs = {
            "phone_number": {"required": True},
            "address": {"required": True},
            "city": {"required": True},
            "postcode": {"required": True},
        }

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password": "Passwords do not match"})
        attrs.pop("password_confirm")
        return attrs

    def validate_phone_number(self, value):
        cleaned = value.replace(" ", "").replace("-", "").replace("+", "")
        if not cleaned.isdigit() or len(cleaned) < 8:
            raise serializers.ValidationError("Please enter a valid phone number")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["email"],
            **validated_data,
        )
        user.is_active = False
        user.save(update_fields=["is_active"])
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
