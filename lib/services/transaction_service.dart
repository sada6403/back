import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import '../models/transaction.dart';

import '../config/api_config.dart';

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
      // Assuming backend has a generic update or specific endpoint
      // Using a PATCH-like approach on the ID
      final url = '$_baseUrl/$transactionId';
      // If your backend doesn't support ID in URL yet, we might need a different approach.
      // For now, I'll assume standard REST: PUT/PATCH /transactions/:id

      final response = await http.patch(
        Uri.parse(url),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'status': status,
          'approvedBy': 'Admin', // In real app, get from AuthService
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

  static Future<List<Transaction>> getTransactions({String? memberId}) async {
    try {
      // If backend supports filtering by memberId via query param
      final uri = memberId != null
          ? Uri.parse('$_baseUrl?memberId=$memberId')
          : Uri.parse(_baseUrl);

      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body is List) {
          return body.map((t) => Transaction.fromJson(t)).toList();
        } else if (body['data'] is List) {
          // Handle wrapped response
          return (body['data'] as List)
              .map((t) => Transaction.fromJson(t))
              .toList();
        }
      }
    } catch (e) {
      debugPrint('Error fetching transactions: $e');
    }
    return [];
  }
}
