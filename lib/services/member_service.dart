import 'dart:convert';
import 'dart:io'; // Added for File
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import '../models/member.dart';
import 'transaction_service.dart';

import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

// Export Member class for external usage if needed, though direct import is better
export '../models/member.dart';

class MemberService {
  static final List<Member> _members = [];
  static String get _baseUrl => ApiConfig.members;

  static Future<void> init() async {
    await fetchMembers();
  }

  static Future<void> fetchMembers({String? query}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final uri = query != null && query.isNotEmpty
          ? Uri.parse('$_baseUrl?search=$query')
          : Uri.parse(_baseUrl);

      final response = await http.get(
        uri,
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> body = jsonDecode(response.body);
        if (body['success'] == true) {
          final List<dynamic> list = body['data'] ?? [];
          _members.clear();
          for (final m in list) {
            _members.add(Member.fromJson(m as Map<String, dynamic>));
          }
        }
      } else {
        debugPrint('Failed to load members: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error fetching members: $e');
    }
  }

  static List<Member> getMembers() => List.from(_members);

  static Member create({
    String? id,
    required String name,
    required String contact,
    String email = '',
    DateTime? dob,
    DateTime? joinedDate,
    double totalBought = 0.0,
    double totalSold = 0.0,
  }) {
    return Member(
      id: id ?? '',
      name: name,
      contact: contact,
      email: email,
      dob: dob,
      joinedDate: joinedDate,
      totalBought: totalBought,
      totalSold: totalSold,
      transactions: [],
    );
  }

  static Future<void> addMember(Member member) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      var token = prefs.getString('token') ?? '';

      // DEBUG: Print token to see what is wrong
      debugPrint('RAW TOKEN FROM PREFS: [$token]');

      if (token.isEmpty) {
        throw Exception('Not logged in. Please Logout and Login again.');
      }

      // Robust Cleaning: Remove "Bearer " if present, remove quotes, trim whitespace
      if (token.startsWith('Bearer ')) {
        token = token.substring(7);
      }
      token = token.replaceAll('"', '').trim();

      debugPrint('CLEANED TOKEN SENT: [$token]');

      final response = await http.post(
        Uri.parse(_baseUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(member.toJson()),
      );
      debugPrint('ADD MEMBER STATUS: ${response.statusCode}');
      debugPrint('ADD MEMBER BODY: ${response.body}');

      if (response.statusCode == 201) {
        await fetchMembers();
      } else {
        // If auth failed, clear the bad token so user is forced to login
        if (response.statusCode == 401 || response.statusCode == 403) {
          await prefs.remove('token');
          throw Exception(
            'Session Expired (Code ${response.statusCode}). Please Restart App and Login.',
          );
        }
        throw Exception(response.body);
      }
    } catch (e) {
      debugPrint('Error adding member: $e');
      rethrow;
    }
  }

  static Future<void> updateMember(String id, Member updated) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final response = await http.put(
        Uri.parse('$_baseUrl/$id'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(updated.toJson()),
      );
      if (response.statusCode == 200) {
        // Refresh list to get updated data
        await fetchMembers();
      } else {
        throw Exception('Failed to update member: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error updating member: $e');
      rethrow;
    }
  }

  static Future<void> toggleStatus(String id) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final response = await http.patch(
        Uri.parse('$_baseUrl/$id/status'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) {
        await fetchMembers();
      } else {
        throw Exception('Failed to toggle status: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error toggling member status: $e');
      rethrow;
    }
  }

  static Future<void> deleteMember(String id) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final response = await http.delete(
        Uri.parse('$_baseUrl/$id'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) {
        _members.removeWhere((m) => m.id == id);
      } else {
        throw Exception('Failed to delete member: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('Error deleting member: $e');
      rethrow;
    }
  }

  static Future<void> addTransaction(
    String memberId, {
    required double amount,
    required String type, // 'buy' or 'sell'
    required String description,
    String product = '',
  }) async {
    await TransactionService.addTransaction(
      memberId: memberId,
      amount: amount,
      type: type,
      description: description,
      product: product,
    );
  }

  static Future<Map<String, dynamic>> uploadBulkMembers(File file) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse(ApiConfig.bulkMembers),
      );
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      if (token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      request.files.add(await http.MultipartFile.fromPath('file', file.path));

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        await fetchMembers(); // Refresh locally
        return body;
      } else {
        throw Exception('Bulk upload failed: ${response.body}');
      }
    } catch (e) {
      debugPrint('Error uploading bulk members: $e');
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> importMembersExcel(
    List<Map<String, dynamic>> rows,
  ) async {
    // Legacy method kept for reference
    return {};
  }
}
