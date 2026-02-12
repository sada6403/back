import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/login_page.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'config/api_config.dart';

import 'services/audit_service.dart';
import 'services/auth_service.dart';
import 'services/session_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load connection settings
  try {
    // Initialize services that need local storage
    await AuthService.init(); // Restore auth state

    // Check and migrate API URL if needed
    final prefs = await SharedPreferences.getInstance();
    String? savedUrl = prefs.getString('api_base_url');

    // If the saved URL is local and code default is remote, force migration
    if (savedUrl != null &&
        (savedUrl.contains('localhost') || savedUrl.contains('10.0.2.2')) &&
        !ApiConfig.baseUrl.contains('localhost')) {
      debugPrint('Migrating from local to remote: ${ApiConfig.baseUrl}');
      await prefs.setString('api_base_url', ApiConfig.baseUrl);
      ApiConfig.setBaseUrl(ApiConfig.baseUrl);
    } else if (savedUrl != null) {
      ApiConfig.setBaseUrl(savedUrl);
    }

    await SessionService.init(); // Auto-start session if logged in
    await AuditService.init(); // Load audit logs
  } catch (e) {
    debugPrint('Failed to load config: $e');
  }

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'NF Admin Panel',
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0F172A), // Dark Navy/Slate
        primaryColor: const Color(0xFF0EA5E9), // Sky Blue
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF0EA5E9),
          secondary: Color(0xFF6366F1), // Indigo
          surface: Color(0xFF1E293B),
        ),
        textTheme: GoogleFonts.jetBrainsMonoTextTheme(
          ThemeData.dark().textTheme,
        ),
        appBarTheme: AppBarTheme(
          backgroundColor: const Color(0xFF0F172A),
          elevation: 0,
          titleTextStyle: GoogleFonts.jetBrainsMono(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
          iconTheme: const IconThemeData(color: Colors.white),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF0EA5E9),
            foregroundColor: Colors.white,
            textStyle: GoogleFonts.jetBrainsMono(fontWeight: FontWeight.bold),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFF1E293B),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: BorderSide.none,
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8),
            borderSide: const BorderSide(color: Color(0xFF0EA5E9), width: 2),
          ),
          labelStyle: const TextStyle(color: Colors.grey),
        ),
      ),
      home: const LoginPage(),
    );
  }
}
