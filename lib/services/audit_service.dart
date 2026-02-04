import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'auth_service.dart';
import '../config/api_config.dart';

class AuditService {
  static final List<Map<String, dynamic>> _logs = [];

  static Future<void> init() async {
    await _loadLogs();
  }

  static Future<void> logAction(
    String action,
    String details, {
    String? targetUser,
  }) async {
    final entry = {
      'timestamp': DateTime.now().toIso8601String(),
      'actor': AuthService.firstName.isNotEmpty
          ? AuthService.firstName
          : (AuthService.userId ?? 'Unknown'),
      'actorRole': AuthService.role,
      'action': action,
      'details': details,
      'targetUser': targetUser ?? 'N/A',
    };

    _logs.insert(0, entry);
    // Keep only last 100 logs locally
    if (_logs.length > 100) _logs.removeLast();

    await _persistLogs();

    debugPrint('AUDIT: [${entry['actor']}] $action - $details');

    // Fire and forget send to backend
    _sendToBackend(entry);
  }

  static Future<void> _sendToBackend(Map<String, dynamic> entry) async {
    try {
      await http.post(
        Uri.parse('${ApiConfig.baseUrl}/analysis/activity'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'userId': AuthService.userId ?? 'Unknown',
          'username': AuthService.firstName,
          'role': AuthService.role,
          'action': entry['action'],
          'details': entry['details'],
          'target': entry['targetUser'],
        }),
      );
    } catch (_) {
      // Fail silently if offline or endpoint missing, log is saved locally
    }
  }

  static List<Map<String, dynamic>> getLogs() {
    return List.unmodifiable(_logs);
  }

  static Future<void> _persistLogs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('audit_logs', jsonEncode(_logs));
    } catch (e) {
      debugPrint('Error saving audit logs: $e');
    }
  }

  static Future<void> _loadLogs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? logsJson = prefs.getString('audit_logs');
      if (logsJson != null) {
        final List<dynamic> decoded = jsonDecode(logsJson);
        _logs.clear();
        for (var item in decoded) {
          _logs.add(item as Map<String, dynamic>);
        }
      }
    } catch (e) {
      debugPrint('Error loading audit logs: $e');
    }
  }
}
