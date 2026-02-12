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

    // Determine role based on User ID prefix
    String roleToUse = 'it_sector';
    if (enteredUser.toUpperCase().startsWith('AZ') ||
        enteredUser.contains('@')) {
      // If it's an email or starts with AZ, it could be an analyzer
      roleToUse = 'analyzer';
    }

    setState(() => _isLoading = true);

    // Call async login
    bool success = await AuthService.login(
      enteredUser,
      enteredPass,
      role: roleToUse,
    );

    // If failed, and role was 'analyzer' (detected from email), try 'it_sector' as fallback
    if (!success && roleToUse == 'analyzer' && enteredUser.contains('@')) {
      debugPrint('Login failed as Analyzer, retrying as IT Sector...');
      success = await AuthService.login(
        enteredUser,
        enteredPass,
        role: 'it_sector',
      );
      if (success) roleToUse = 'it_sector';
    }

    // If still failed, and role was 'it_sector', try 'manager' as fallback
    if (!success && roleToUse == 'it_sector') {
      debugPrint('Login failed as IT Sector, retrying as Manager...');
      success = await AuthService.login(
        enteredUser,
        enteredPass,
        role: 'manager',
      );
      if (success) roleToUse = 'manager';
    }

    if (!mounted) return;

    setState(() => _isLoading = false);

    if (success) {
      // Check if the user is authorized for this app (IT Sector Only)
      if (AuthService.role == 'manager') {
        // Access Denied for Managers
        await AuthService.logout(); // Clear session
        if (!mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Access Denied: This app is for IT Sector only.'),
            backgroundColor: Colors.red,
            duration: Duration(seconds: 4),
          ),
        );
      } else {
        // Authorized (Admin / IT Sector)
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const DashboardScreen()),
        );
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(AuthService.lastError ?? 'Invalid User ID or Password'),
          backgroundColor: Colors.red,
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
