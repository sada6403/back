import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class AnalysisService {
  static Future<Map<String, dynamic>> getAnalysisData({
    String role = 'it_sector',
  }) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConfig.analysis}?role=$role'),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to load analysis data');
      }
    } catch (e) {
      throw Exception('Error loading data: $e');
    }
  }
}
