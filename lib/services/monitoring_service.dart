import 'api_service.dart';

class MonitoringService {
  /// Get list of online users
  static Future<Map<String, dynamic>> getOnlineUsers({
    String? role,
    String? branch,
    String? search,
  }) async {
    final params = <String, String>{};
    if (role != null && role.isNotEmpty) params['role'] = role;
    if (branch != null && branch.isNotEmpty) params['branch'] = branch;
    if (search != null && search.isNotEmpty) params['search'] = search;

    final queryString = params.entries
        .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
        .join('&');

    final url = queryString.isEmpty
        ? '/monitor/online-users'
        : '/monitor/online-users?$queryString';

    return await ApiService.get(url);
  }

  /// Get activity logs
  static Future<Map<String, dynamic>> getActivityLogs({
    String? userId,
    String? role,
    String? eventType,
    String? startDate,
    String? endDate,
    int page = 1,
    int limit = 50,
  }) async {
    final params = <String, String>{
      'page': page.toString(),
      'limit': limit.toString(),
    };

    if (userId != null && userId.isNotEmpty) params['userId'] = userId;
    if (role != null && role.isNotEmpty) params['role'] = role;
    if (eventType != null && eventType.isNotEmpty) {
      params['eventType'] = eventType;
    }
    if (startDate != null && startDate.isNotEmpty) {
      params['startDate'] = startDate;
    }
    if (endDate != null && endDate.isNotEmpty) params['endDate'] = endDate;

    final queryString = params.entries
        .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
        .join('&');

    return await ApiService.get('/monitor/activity-logs?$queryString');
  }

  /// Get monitoring statistics
  static Future<Map<String, dynamic>> getStats() async {
    return await ApiService.get('/monitor/stats');
  }
}
