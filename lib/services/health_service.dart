import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class HealthService {
  /// Checks if the backend is reachable.
  /// Returns [true] if reachable, [false] otherwise.
  static Future<bool> checkConnection() async {
    try {
      // Just check the base URL or a specific health endpoint.
      // Since we don't know if /health exists, checking the root /api might 404 but still prove connectivity,
      // or we can try a known lightweight endpoint like /employees?limit=1
      // For now, let's try a HEAD request to the base URL or analysis endpoint.

      final response = await http.get(Uri.parse(ApiConfig.baseUrl));

      // Even a 404 means we connected to the server.
      // A connection error would throw an exception.
      return response.statusCode < 500;
    } catch (e) {
      return false;
    }
  }
}
