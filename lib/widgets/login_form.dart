import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import 'common/input_field.dart';
import 'common/login_button.dart';

class LoginForm extends StatefulWidget {
  const LoginForm({super.key});

  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final TextEditingController _userController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();

  Widget _buildForgotPasswordLink() {
    return Align(
      alignment: Alignment.centerLeft,
      child: TextButton(
        onPressed: () {
          showDialog(
            context: context,
            builder: (context) {
              final TextEditingController userIdController =
                  TextEditingController();
              final TextEditingController otpController =
                  TextEditingController();
              final TextEditingController newPassController =
                  TextEditingController();
              final TextEditingController confirmPassController =
                  TextEditingController();

              bool otpSent = false;
              bool otpVerified = false;
              bool showNewPass = false;
              bool showConfirmPass = false;
              String? resetToken; // Store token from verification

              return StatefulBuilder(
                builder: (context, setState) {
                  // Step 1: Enter User ID and send OTP (to Email)
                  if (!otpSent) {
                    return AlertDialog(
                      title: const Text('Reset Password'),
                      content: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text(
                            'Enter your User ID or Email to receive OTP',
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: userIdController,
                            keyboardType: TextInputType.text,
                            decoration: const InputDecoration(
                              labelText: 'User ID or Email',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ],
                      ),
                      actions: [
                        TextButton(
                          onPressed: () {
                            Navigator.of(context).pop();
                          },
                          child: const Text('Cancel'),
                        ),
                        TextButton(
                          onPressed: () async {
                            if (userIdController.text.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Please enter User ID'),
                                ),
                              );
                              return;
                            }

                            // Call Real API
                            final success =
                                await AuthService.requestPasswordResetOtp(
                                  userIdController.text.trim(),
                                );

                            if (!context.mounted) return;

                            if (success) {
                              setState(() {
                                otpSent = true;
                              });
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'OTP sent to your registered Email',
                                  ),
                                  duration: Duration(seconds: 3),
                                ),
                              );
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Failed to send OTP. Check User ID.',
                                  ),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          },
                          child: const Text('Send OTP'),
                        ),
                      ],
                    );
                  }

                  // Step 2: Verify OTP
                  if (otpSent && !otpVerified) {
                    return AlertDialog(
                      title: const Text('Verify OTP'),
                      content: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('Enter the OTP sent to your Email'),
                          const SizedBox(height: 16),
                          TextField(
                            controller: otpController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'OTP',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ],
                      ),
                      actions: [
                        TextButton(
                          onPressed: () {
                            setState(() {
                              otpSent = false;
                              otpController.clear();
                            });
                          },
                          child: const Text('Back'),
                        ),
                        TextButton(
                          onPressed: () async {
                            if (otpController.text.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Please enter OTP'),
                                ),
                              );
                              return;
                            }

                            final token =
                                await AuthService.verifyPasswordResetOtp(
                                  userIdController.text.trim(),
                                  otpController.text.trim(),
                                );

                            if (!context.mounted) return;

                            if (token != null) {
                              setState(() {
                                otpVerified = true;
                                resetToken = token;
                              });
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('OTP verified successfully'),
                                ),
                              );
                            } else {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Invalid OTP'),
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          },
                          child: const Text('Verify'),
                        ),
                      ],
                    );
                  }

                  // Step 3: Reset password
                  if (otpVerified) {
                    return AlertDialog(
                      title: const Text('Set New Password'),
                      content: SingleChildScrollView(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            TextField(
                              controller: newPassController,
                              obscureText: !showNewPass,
                              decoration: InputDecoration(
                                labelText: 'New Password',
                                border: const OutlineInputBorder(),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    showNewPass
                                        ? Icons.visibility
                                        : Icons.visibility_off,
                                    color: Colors.grey,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      showNewPass = !showNewPass;
                                    });
                                  },
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: confirmPassController,
                              obscureText: !showConfirmPass,
                              decoration: InputDecoration(
                                labelText: 'Confirm Password',
                                border: const OutlineInputBorder(),
                                suffixIcon: IconButton(
                                  icon: Icon(
                                    showConfirmPass
                                        ? Icons.visibility
                                        : Icons.visibility_off,
                                    color: Colors.grey,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      showConfirmPass = !showConfirmPass;
                                    });
                                  },
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      actions: [
                        TextButton(
                          onPressed: () {
                            setState(() {
                              otpVerified = false;
                              otpController.clear();
                              showNewPass = false;
                              showConfirmPass = false;
                              resetToken = null;
                            });
                          },
                          child: const Text('Back'),
                        ),
                        TextButton(
                          onPressed: () async {
                            final newPass = newPassController.text;
                            final confirmPass = confirmPassController.text;

                            if (newPass.isEmpty || confirmPass.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Please fill all fields'),
                                ),
                              );
                              return;
                            }

                            if (newPass == confirmPass) {
                              // Call Real Reset API
                              final success =
                                  await AuthService.completePasswordReset(
                                    userIdController.text.trim(),
                                    newPass,
                                    resetToken!,
                                  );

                              if (!context.mounted) return;

                              if (success) {
                                if (!context.mounted) return;
                                Navigator.of(context).pop();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Password changed successfully! Please login with new password.',
                                    ),
                                    duration: Duration(seconds: 4),
                                  ),
                                );
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text(
                                      'Failed to reset password. Token might be expired.',
                                    ),
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            } else {
                              ScaffoldMessenger.of(this.context).showSnackBar(
                                const SnackBar(
                                  content: Text('Both passwords are different'),
                                ),
                              );
                            }
                          },
                          child: const Text('Submit'),
                        ),
                      ],
                    );
                  }

                  return const SizedBox.shrink();
                },
              );
            },
          );
        },
        child: const Text(
          'Forgot password?',
          style: TextStyle(
            color: Colors.blue,
            decoration: TextDecoration.underline,
            decorationColor: Colors.blue,
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _userController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        // Title Text
        const Text(
          'Welcome Back!',
          style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
          textAlign: TextAlign.left,
        ),

        const SizedBox(height: 48.0),

        // Input Fields and Button Section wrapped in a Card
        Card(
          elevation: 4.0,
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: <Widget>[
                // User ID Field
                InputField(
                  label: 'User ID',
                  isObscure: false,
                  controller: _userController,
                ),
                const SizedBox(height: 20.0),
                // Password Field
                InputField(
                  label: 'Password',
                  isObscure: true,
                  controller: _passwordController,
                ),
                const SizedBox(height: 30.0),
                // Login Button
                LoginButton(
                  userController: _userController,
                  passwordController: _passwordController,
                ),
                const SizedBox(height: 10.0),
                // Forgot Password Link
                _buildForgotPasswordLink(),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
