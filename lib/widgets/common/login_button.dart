import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../screens/dashboard_screen.dart';

class LoginButton extends StatefulWidget {
  final TextEditingController userController;
  final TextEditingController passwordController;

  const LoginButton({
    super.key,
    required this.userController,
    required this.passwordController,
  });

  @override
  State<LoginButton> createState() => _LoginButtonState();
}

class _LoginButtonState extends State<LoginButton> {
  bool _isLoading = false;

  Future<void> _handleLogin() async {
    final enteredUser = widget.userController.text.trim();
    final enteredPass = widget.passwordController.text;

    if (enteredUser.isEmpty || enteredPass.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter User ID and Password')),
      );
      return;
    }

    setState(() => _isLoading = true);

    // Call async login
    final success = await AuthService.login(enteredUser, enteredPass);

    if (!mounted) return;

    setState(() => _isLoading = false);

    if (success) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const DashboardScreen()),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invalid User ID or Password (or connection failed)'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 50,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _handleLogin,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.black87,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
          elevation: 0,
        ),
        child: _isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              )
            : const Text(
                'Login',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
      ),
    );
  }
}
