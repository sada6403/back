import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class Transaction {
  final DateTime date;
  final double amount;
  final String type; // 'buy' or 'sell'
  final String description;
  final String product; // product name or details

  Transaction({
    required this.date,
    required this.amount,
    required this.type,
    required this.description,
    required this.product,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      date: DateTime.parse(json['date'] as String),
      amount: (json['amount'] as num).toDouble(),
      type: json['type'] as String,
      description: json['description'] as String,
      product: json['product'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'date': date.toIso8601String(),
    'amount': amount,
    'type': type,
    'description': description,
    'product': product,
  };
}

class Member {
  final String id;
  final String name;
  final String contact; // phone number
  final String email;
  final DateTime? dob;
  final DateTime? joinedDate;
  final double totalBought;
  final double totalSold;
  final List<Transaction> transactions;

  Member({
    required this.id,
    required this.name,
    required this.contact,
    required this.email,
    required this.dob,
    required this.joinedDate,
    required this.totalBought,
    required this.totalSold,
    required this.transactions,
  });

  factory Member.fromJson(Map<String, dynamic> json) {
    return Member(
      id: json['id'] as String,
      name: json['name'] as String,
      contact: json['contact'] as String,
      email: json['email'] as String? ?? '',
      dob: json['dob'] != null ? DateTime.parse(json['dob'] as String) : null,
      joinedDate: json['joinedDate'] != null
          ? DateTime.parse(json['joinedDate'] as String)
          : null,
      totalBought: (json['totalBought'] as num).toDouble(),
      totalSold: (json['totalSold'] as num).toDouble(),
      transactions: (json['transactions'] as List<dynamic>? ?? [])
          .map((t) => Transaction.fromJson(t as Map<String, dynamic>))
          .toList(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'contact': contact,
    'email': email,
    'dob': dob?.toIso8601String(),
    'joinedDate': joinedDate?.toIso8601String(),
    'totalBought': totalBought,
    'totalSold': totalSold,
    'transactions': transactions.map((t) => t.toJson()).toList(),
  };
}

class MemberService {
  static const String _storageKey = 'members';
  static final List<Member> _members = [];

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final json = prefs.getString(_storageKey);
    if (json != null) {
      final data = jsonDecode(json) as List<dynamic>;
      _members.clear();
      _members.addAll(
        data.map((m) => Member.fromJson(m as Map<String, dynamic>)),
      );
    }
  }

  static Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    final json = jsonEncode(_members.map((m) => m.toJson()).toList());
    await prefs.setString(_storageKey, json);
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
    final memberId = id ?? 'M${DateTime.now().millisecondsSinceEpoch}';
    return Member(
      id: memberId,
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

  static void addMember(Member member) {
    _members.add(member);
    _persist();
  }

  static void updateMember(String id, Member updated) {
    final idx = _members.indexWhere((m) => m.id == id);
    if (idx >= 0) {
      _members[idx] = updated;
      _persist();
    }
  }

  static void deleteMember(String id) {
    _members.removeWhere((m) => m.id == id);
    _persist();
  }

  static void addTransaction(
    String memberId, {
    required double amount,
    required String type, // 'buy' or 'sell'
    required String description,
    String product = '',
  }) {
    final idx = _members.indexWhere((m) => m.id == memberId);
    if (idx >= 0) {
      final member = _members[idx];
      final transaction = Transaction(
        date: DateTime.now(),
        amount: amount,
        type: type,
        description: description,
        product: product,
      );
      final updatedMember = Member(
        id: member.id,
        name: member.name,
        contact: member.contact,
        email: member.email,
        dob: member.dob,
        joinedDate: member.joinedDate,
        totalBought: type == 'buy'
            ? member.totalBought + amount
            : member.totalBought,
        totalSold: type == 'sell'
            ? member.totalSold + amount
            : member.totalSold,
        transactions: [...member.transactions, transaction],
      );
      _members[idx] = updatedMember;
      _persist();
    }
  }
}
