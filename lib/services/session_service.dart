import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'api_service.dart';

class SessionService {
  static Timer? _pingTimer;
  static String? _deviceId;
  static bool _isSessionActive = false;
  static bool _isInitializing = false;

  /// Initialize and auto-start session if token exists
  static Future<void> init() async {
    if (_isSessionActive || _isInitializing) return;
    _isInitializing = true;

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      if (token != null && token.isNotEmpty) {
        debugPrint('[SessionService] Token found, auto-starting session...');
        await _startSessionInternal();
      } else {
        debugPrint(
          '[SessionService] No token found, session will start on login',
        );
      }
    } catch (e) {
      debugPrint('[SessionService] Initialization error: $e');
    } finally {
      _isInitializing = false;
    }
  }

  /// Start a new session or resume existing one
  static Future<void> startSession({String? currentScreen}) async {
    await init(); // Ensure we try to init first if not already
    if (_isSessionActive) return;
    await _startSessionInternal(currentScreen: currentScreen);
  }

  static Future<void> _startSessionInternal({String? currentScreen}) async {
    try {
      // Get device information
      final deviceId = await _getDeviceId();
      final platform = _getPlatform();
      final appVersion = await _getAppVersion();
      final deviceInfo = await _getDeviceInfo();

      // Call backend to start session
      final response = await ApiService.post('/session/start', {
        'deviceId': deviceId,
        'platform': platform,
        'appVersion': appVersion,
        'deviceInfo': deviceInfo,
        'currentScreen': currentScreen,
      });

      if (response['success'] == true) {
        _isSessionActive = true;
        debugPrint('[SessionService] Session started: ${response['message']}');

        // Start heartbeat ping
        _startHeartbeat();
      } else {
        debugPrint(
          '[SessionService] Failed to start session: ${response['message']}',
        );
      }
    } catch (e) {
      debugPrint('[SessionService] Error starting session: $e');
    }
  }

  /// Send heartbeat ping to keep session alive (heartbeat)
  static Future<void> pingSession({String? currentScreen}) async {
    try {
      if (!_isSessionActive) {
        debugPrint('[SessionService] No active session to ping');
        return;
      }

      final deviceId = await _getDeviceId();

      final response = await ApiService.post('/session/ping', {
        'deviceId': deviceId,
        'currentScreen': currentScreen,
      });

      if (response['success'] == true) {
        debugPrint('[SessionService] Ping successful: ${response['lastPing']}');
      } else {
        debugPrint('[SessionService] Ping failed: ${response['message']}');
      }
    } catch (e) {
      debugPrint('[SessionService] Error pinging session: $e');
      // Don't stop session on ping error - network might be temporarily down
    }
  }

  /// End the current session
  static Future<void> endSession({String reason = 'logout'}) async {
    try {
      if (!_isSessionActive) {
        debugPrint('[SessionService] No active session to end');
        return;
      }

      // Stop heartbeat
      _stopHeartbeat();

      final deviceId = await _getDeviceId();

      final response = await ApiService.post('/session/end', {
        'deviceId': deviceId,
        'reason': reason,
      });

      if (response['success'] == true) {
        _isSessionActive = false;
        debugPrint(
          '[SessionService] Session ended: ${response['duration']} minutes',
        );
      } else {
        debugPrint(
          '[SessionService] Failed to end session: ${response['message']}',
        );
      }
    } catch (e) {
      debugPrint('[SessionService] Error ending session: $e');
    }
  }

  /// Log generic activity to backend
  static Future<void> logActivity(
    String eventType, {
    String? details,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      if (!_isSessionActive) {
        // Try lazy-resume if we have a token (useful after hot reload)
        await init();
      }

      if (!_isSessionActive) {
        debugPrint('[SessionService] Cannot log activity: Session not active');
        return;
      }

      final deviceId = await _getDeviceId();
      final platform = _getPlatform();

      await ApiService.post('/session/log', {
        'eventType': eventType,
        'details': details,
        'metadata': metadata,
        'deviceId': deviceId,
        'platform': platform,
      });
    } catch (e) {
      debugPrint('[SessionService] Error logging activity: $e');
    }
  }

  /// Start heartbeat timer (ping every 30 seconds as per requirement)
  static void _startHeartbeat() {
    _stopHeartbeat(); // Clear any existing timer

    _pingTimer = Timer.periodic(const Duration(seconds: 30), (timer) {
      pingSession();
    });

    debugPrint('[SessionService] Heartbeat started (30s interval)');
  }

  /// Stop heartbeat timer
  static void _stopHeartbeat() {
    _pingTimer?.cancel();
    _pingTimer = null;
    debugPrint('[SessionService] Heartbeat stopped');
  }

  /// Get or generate device ID
  static Future<String> _getDeviceId() async {
    if (_deviceId != null) return _deviceId!;

    final prefs = await SharedPreferences.getInstance();
    String? storedId = prefs.getString('device_id');

    if (storedId == null) {
      // Generate new device ID
      storedId = 'device_${DateTime.now().millisecondsSinceEpoch}';
      await prefs.setString('device_id', storedId);
    }

    _deviceId = storedId;
    return storedId;
  }

  /// Get platform name
  static String _getPlatform() {
    if (kIsWeb) return 'web';
    if (Platform.isAndroid) return 'android';
    if (Platform.isIOS) return 'ios';
    return 'unknown';
  }

  /// Get app version
  static Future<String> _getAppVersion() async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      return '${packageInfo.version}+${packageInfo.buildNumber}';
    } catch (e) {
      return 'unknown';
    }
  }

  /// Get device information string
  static Future<String> _getDeviceInfo() async {
    try {
      final deviceInfoPlugin = DeviceInfoPlugin();

      if (kIsWeb) {
        final webInfo = await deviceInfoPlugin.webBrowserInfo;
        return '${webInfo.browserName} ${webInfo.platform}';
      } else if (Platform.isAndroid) {
        final androidInfo = await deviceInfoPlugin.androidInfo;
        return '${androidInfo.brand} ${androidInfo.model} (Android ${androidInfo.version.release})';
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfoPlugin.iosInfo;
        return '${iosInfo.name} ${iosInfo.model} (iOS ${iosInfo.systemVersion})';
      }
    } catch (e) {
      debugPrint('[SessionService] Error getting device info: $e');
    }

    return 'Unknown Device';
  }

  /// Check if session is active
  static bool get isActive => _isSessionActive;

  /// Dispose resources
  static void dispose() {
    _stopHeartbeat();
    _isSessionActive = false;
  }
}
