import 'package:flutter/foundation.dart';

class ApiConfig {
  static String baseUrl = 'http://localhost:3001/api';
  // static String baseUrl = 'http://13.48.199.103:3001/api';
  static String get rootUrl => baseUrl.replaceAll('/api', '');

  static String get analysis => '/analysis';
  static String get health => '/health';

  static String get users => '/employees';
  static String get fieldVisitors => '/employees';
  static String get managers => '/employees';
  static String get authRegister => '/auth/register';
  static String get authRegisterITSector => '/auth/register/it-sector';
  static String get authLogin => '/auth/login';
  static String get members => '/members';
  static String get products => '/products';
  static String get transactions => '/transactions';
  static String get itSectorImport => '/it-sector/import';
  static String get membersImport => '/members/import';
  static String get bulkEmployees => '/bulk/employees';
  static String get bulkMembers => '/bulk/members';
  static String get auditLogs => '/admin/audit-logs';

  static void setBaseUrl(String url) {
    if (url.isEmpty) {
      debugPrint(
        '[ApiConfig] WARNING: Attempted to set empty baseUrl! Ignoring.',
      );
      return;
    }
    debugPrint('[ApiConfig] Setting baseUrl to: $url');
    // Remove trailing slash if present
    if (url.endsWith('/')) {
      baseUrl = url.substring(0, url.length - 1);
    } else {
      baseUrl = url;
    }
  }
}
