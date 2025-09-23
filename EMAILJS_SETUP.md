# EmailJS Setup Guide

## 🚀 Quick Setup (5 minutes)

### 1. Create EmailJS Account
1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Click "Sign Up" and create a free account
3. Verify your email address

### 2. Add Email Service
1. In your EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider:
   - **Gmail** (recommended for testing)
   - **Outlook**
   - **Yahoo**
   - Or any SMTP service
4. Follow the setup instructions for your chosen provider
5. Note down your **Service ID** (e.g., `service_abc123`)

### 3. Create Email Templates
1. Go to "Email Templates"
2. Click "Create New Template"

#### Template 1: Email Verification
- **Template ID**: `template_verification` (or any name you prefer)
- **Subject**: `Verify your Start Up account`
- **Content**:
```
Hello!

Welcome to Start Up! Please verify your email address by entering this code:

{{verification_code}}

This code will expire in 10 minutes.

If you didn't create an account, please ignore this email.

Best regards,
The Start Up Team
```

#### Template 2: Password Reset
- **Template ID**: `template_reset` (or any name you prefer)
- **Subject**: `Reset your Start Up password`
- **Content**:
```
Hello!

You requested to reset your password. Use this code to reset it:

{{reset_code}}

This code will expire in 10 minutes.

If you didn't request this, please ignore this email.

Best regards,
The Start Up Team
```

### 4. Get Your Public Key
1. Go to "Account" → "General"
2. Copy your **Public Key** (e.g., `user_abc123def456`)

### 5. Update Your Code
Replace these placeholders in your HTML files:

#### In `register.html` and `forgot.html`:
```javascript
// Replace this line:
emailjs.init('YOUR_PUBLIC_KEY');

// With your actual public key:
emailjs.init('user_abc123def456');
```

#### In the email sending functions:
```javascript
// Replace these lines:
'YOUR_SERVICE_ID',     // Replace with your service ID
'YOUR_TEMPLATE_ID',    // Replace with your template ID

// With your actual IDs:
'service_abc123',      // Your service ID
'template_verification' // Your template ID
```

## 📧 Example Configuration

After setup, your code should look like this:

```javascript
// Initialize EmailJS
emailjs.init('user_abc123def456');

// Send verification email
const response = await emailjs.send(
    'service_abc123',        // Your service ID
    'template_verification', // Your template ID
    {
        to_email: 'user@example.com',
        verification_code: '123456',
        app_name: 'Start Up'
    }
);
```

## 🧪 Testing

1. Open `register.html` in your browser
2. Fill out the registration form
3. Check your email for the verification code
4. Enter the code to complete registration

## 📊 Free Plan Limits

- **200 emails/month** - Perfect for development and testing
- **2 email services** - Enough for verification and reset
- **2 email templates** - Exactly what you need

## 🔧 Troubleshooting

### Common Issues:
1. **"EmailJS not defined"** - Make sure you included the EmailJS script
2. **"Service not found"** - Check your service ID is correct
3. **"Template not found"** - Check your template ID is correct
4. **Emails not sending** - Verify your email service is properly configured

### Debug Mode:
Add this to see detailed logs:
```javascript
emailjs.init('your_public_key', {
    debug: true
});
```

## 🚀 Ready to Go!

Once you've completed these steps, your email verification system will be fully functional! Users will receive real verification codes via email.
