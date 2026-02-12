class ApiConfig {
  static String baseUrl = "http://16.16.64.104:3001/api";
  // static String baseUrl = "http://localhost:3001/api";
  static String get rootUrl => baseUrl.replaceAll('/api', '');

  static String get analysis => '$baseUrl/analysis';
  static String get health =>
      '$baseUrl/health'; // Assuming health check is at /health or similar, or just check root

  static String get users => '$baseUrl/employees';
  static String get fieldVisitors => '$baseUrl/employees';
  static String get managers => '$baseUrl/employees';
  static String get authRegister => '$baseUrl/auth/register';
  static String get authRegisterITSector => '$baseUrl/auth/register/it-sector';
  static String get authLogin => '$baseUrl/auth/login';
  static String get members => '$baseUrl/members';
  static String get products => '$baseUrl/products';
  static String get transactions => '$baseUrl/transactions';
  static String get itSectorImport => '$baseUrl/it-sector/import';
  static String get membersImport => '$baseUrl/members/import';
  static String get bulkEmployees => '$baseUrl/bulk/employees';
  static String get bulkMembers => '$baseUrl/bulk/members';
  static String get auditLogs => '$baseUrl/admin/audit-logs';

  static void setBaseUrl(String url) {
    // Remove trailing slash if present
    if (url.endsWith('/')) {
      baseUrl = url.substring(0, url.length - 1);
    } else {
      baseUrl = url;
    }
  }
}
