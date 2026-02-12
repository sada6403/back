import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import '../models/transaction.dart';

import '../config/api_config.dart';
import 'api_service.dart';
import 'session_service.dart';

class TransactionService {
  static String get _baseUrl => ApiConfig.transactions;

  static Future<void> addTransaction({
    required String memberId,
    required double amount,
    required String type,
    required String description,
    required String product,
  }) async {
    try {
      final isHighValue = amount > 50000;
      final status = isHighValue ? 'pending' : 'approved';

      final response = await http.post(
        Uri.parse(_baseUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'memberId': memberId,
          'amount': amount,
          'type': type,
          'description': description,
          'product': product,
          'date': DateTime.now().toIso8601String(),
          'status': status,
        }),
      );

      if (response.statusCode == 201) {
        debugPrint('Transaction added successfully (Status: $status)');
      } else {
        debugPrint('Failed to add transaction: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error adding transaction: $e');
    }
  }

  static Future<bool> updateStatus(
    String transactionId,
    String status, {
    String? note,
  }) async {
    try {
      final url = '$_baseUrl/$transactionId';
      final response = await http.patch(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'status': status,
          'approvedBy': 'Admin',
          'approvedAt': DateTime.now().toIso8601String(),
          if (note != null) 'note': note,
        }),
      );

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error updating transaction status: $e');
      return false;
    }
  }

  static Future<String?> updateTransaction(
    String id,
    Map<String, dynamic> data,
  ) async {
    try {
      final url = '$_baseUrl/$id';
      final response = await http.put(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(data),
      );
      debugPrint('Update Transaction Response: ${response.statusCode}');
      debugPrint('Update Transaction Body: ${response.body}');

      if (response.statusCode == 200) {
        return null; // Success
      } else {
        return 'Failed: ${response.statusCode} - ${response.body}';
      }
    } catch (e) {
      debugPrint('Error updating transaction: $e');
      return 'Error: $e';
    }
  }

  static Future<bool> deleteTransaction(String id) async {
    try {
      final url = '$_baseUrl/$id';
      final response = await http.delete(Uri.parse(url));
      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error deleting transaction: $e');
      return false;
    }
  }

  static Future<List<Transaction>> getTransactions({
    String? memberId,
    String? billNumber,
  }) async {
    try {
      final queryParams = <String, String>{};
      if (memberId != null) queryParams['memberId'] = memberId;
      if (billNumber != null) queryParams['billNumber'] = billNumber;

      final queryString = Uri(queryParameters: queryParams).query;
      final endpoint = queryString.isEmpty
          ? '/transactions'
          : '/transactions?$queryString';

      final responseData = await ApiService.get(endpoint);

      if (responseData != null) {
        final List<dynamic> list = responseData is List
            ? responseData
            : (responseData['data'] ?? []);

        // Log Data View
        SessionService.logActivity(
          'DATA_VIEW',
          details: 'Fetched ${list.length} transactions',
        );

        return list.map((t) => Transaction.fromJson(t)).toList();
      }
    } catch (e) {
      debugPrint('Error fetching transactions: $e');
    }
    return [];
  }
}
