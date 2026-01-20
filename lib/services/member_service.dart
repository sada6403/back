import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import '../models/member.dart';
import 'transaction_service.dart';

import '../config/api_config.dart';

// Export Member class for external usage if needed, though direct import is better
export '../models/member.dart';

class MemberService {
  static final List<Member> _members = [];
  static String get _baseUrl => ApiConfig.members;

  static Future<void> init() async {
    await fetchMembers();
  }

  static Future<void> fetchMembers() async {
    try {
      final response = await http.get(Uri.parse(_baseUrl));
      if (response.statusCode == 200) {
        final Map<String, dynamic> body = jsonDecode(response.body);
        if (body['success'] == true) {
          final List<dynamic> list = body['data'];
          _members.clear();
          for (final m in list) {
            _members.add(Member.fromJson(m as Map<String, dynamic>));
          }
        }
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
      final response = await http.post(
        Uri.parse(_baseUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(member.toJson()),
      );
      if (response.statusCode == 201) {
        await fetchMembers();
      }
    } catch (e) {
      debugPrint('Error adding member: $e');
    }
  }

  static Future<void> updateMember(String id, Member updated) async {
    try {
      final response = await http.put(
        Uri.parse('$_baseUrl/$id'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(updated.toJson()),
      );
      if (response.statusCode == 200) {
        // Refresh list to get updated data
        await fetchMembers();
      }
    } catch (e) {
      debugPrint('Error updating member: $e');
    }
  }

  static Future<void> deleteMember(String id) async {
    try {
      final response = await http.delete(Uri.parse('$_baseUrl/$id'));
      if (response.statusCode == 200) {
        _members.removeWhere((m) => m.id == id);
      }
    } catch (e) {
      debugPrint('Error deleting member: $e');
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
}
