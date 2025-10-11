"""
Extract BankID certificates from .p12 file using pure Python.
No OpenSSL command-line tools required!
"""
from datetime import UTC, datetime
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import pkcs12

# Configuration
P12_FILE = Path("secrets/bankid/FPTestcert5_20240610.p12")
CERT_OUT = Path("secrets/bankid/test_cert.pem")
KEY_OUT = Path("secrets/bankid/test_key.pem")
PASSWORD = b"qwerty123"

print("=" * 70)
print("🔐 Extracting BankID Certificates")
print("=" * 70)

# Check if .p12 exists
if not P12_FILE.exists():
    print(f"\n❌ ERROR: {P12_FILE} not found!")
    print("\n   Download from: https://www.bankid.com/en/develop/test")
    print("   File needed: FPTestcert5_20240610.p12")
    exit(1)

print(f"\n📂 Reading: {P12_FILE}")
print(f"   Size: {P12_FILE.stat().st_size:,} bytes")

# Read .p12 file
try:
    with open(P12_FILE, "rb") as f:
        p12_data = f.read()

    # Load PKCS12
    private_key, certificate, additional_certs = pkcs12.load_key_and_certificates(
        p12_data,
        PASSWORD
    )

    if not private_key or not certificate:
        print("\n❌ ERROR: Failed to extract key/certificate from .p12")
        exit(1)

    print("✅ Successfully loaded .p12 file")

except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print("\n   Make sure:")
    print("   1. File is not corrupted")
    print("   2. Password is correct (qwerty123)")
    exit(1)

# Extract and save private key
print("\n📝 Extracting private key...")
key_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.TraditionalOpenSSL,
    encryption_algorithm=serialization.NoEncryption()
)

KEY_OUT.parent.mkdir(parents=True, exist_ok=True)
with open(KEY_OUT, "wb") as f:
    f.write(key_pem)

print(f"   ✅ Saved to: {KEY_OUT}")
print(f"   Size: {len(key_pem):,} bytes")

# Extract and save certificate
print("\n📝 Extracting certificate...")
cert_pem = certificate.public_bytes(serialization.Encoding.PEM)

with open(CERT_OUT, "wb") as f:
    f.write(cert_pem)

print(f"   ✅ Saved to: {CERT_OUT}")
print(f"   Size: {len(cert_pem):,} bytes")

# Display certificate info
print("\n" + "=" * 70)
print("📋 Certificate Details:")
print("=" * 70)

try:
    subject = certificate.subject.rfc4514_string()
    issuer = certificate.issuer.rfc4514_string()

    print(f"Subject: {subject}")
    print(f"Issuer: {issuer}")
    print(f"Serial: {certificate.serial_number}")
    print(f"Valid from: {certificate.not_valid_before_utc}")
    print(f"Valid until: {certificate.not_valid_after_utc}")

    # Check if valid now
    now = datetime.now(UTC)
    if certificate.not_valid_before_utc <= now <= certificate.not_valid_after_utc:
        print("\n✅ Certificate is VALID (current date is within validity period)")
    else:
        print("\n⚠️  WARNING: Certificate is NOT valid for current date!")

except Exception as e:
    print(f"Could not parse certificate details: {e}")

print("\n" + "=" * 70)
print("✅ SUCCESS! Certificates extracted")
print("=" * 70)
print("\nCreated files:")
print(f"  • {CERT_OUT}")
print(f"  • {KEY_OUT}")
print("\nNext step: Download CA certificate manually")
print("  Open: https://www.bankid.com/assets/bankid/rp/bankid_test_ca_v1_for_test_rp.pem")
print("  Save to: backend/secrets/bankid/bankid_ca.pem")
print("=" * 70)
