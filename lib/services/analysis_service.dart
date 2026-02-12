import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class AnalysisService {
  static Future<Map<String, dynamic>> getAnalysisData({
    String role = 'it_sector',
    String? userId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      String url = '${ApiConfig.analysis}/data?role=$role';
      if (userId != null) url += '&userId=$userId';
      if (startDate != null) url += '&startDate=${startDate.toIso8601String()}';
      if (endDate != null) url += '&endDate=${endDate.toIso8601String()}';

      final response = await http.get(Uri.parse(url));

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to load analysis data');
      }
    } catch (e) {
      throw Exception('Error loading data: $e');
    }
  }

  static Future<String?> downloadAnalysisReport({
    String role = 'it_sector',
    String? userId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      String url = '${ApiConfig.analysis}/report?role=$role';
      if (userId != null) url += '&userId=$userId';
      if (startDate != null) url += '&startDate=${startDate.toIso8601String()}';
      if (endDate != null) url += '&endDate=${endDate.toIso8601String()}';

      final response = await http.get(Uri.parse(url));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true) {
          return data['reportUrl'];
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
