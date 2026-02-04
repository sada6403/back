import 'transaction.dart';

class Member {
  final String id;
  final String name;
  final String contact; // phone number
  final String email;
  final DateTime? dob;
  final DateTime? joinedDate;
  final double totalBought;
  final double totalSold;
  final String status;
  final String? nic;
  final String? address;
  final String? memberCode;
  final String? area;
  final String? fieldVisitorId;
  final String? fieldVisitorName;
  final List<Transaction> transactions;
  final Map<String, dynamic> registrationData;

  Member({
    required this.id,
    required this.name,
    required this.contact,
    required this.email,
    required this.dob,
    required this.joinedDate,
    required this.totalBought,
    required this.totalSold,
    this.status = 'active',
    this.nic,
    this.address,
    this.memberCode,
    this.area,
    this.fieldVisitorId,
    this.fieldVisitorName,
    required this.transactions,
    this.registrationData = const {},
  });

  factory Member.fromJson(Map<String, dynamic> json) {
    return Member(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      contact: json['mobile'] as String? ?? '',
      email: json['email'] as String? ?? '',
      dob: json['dob'] != null
          ? DateTime.tryParse(json['dob'] as String)
          : null,
      joinedDate: json['registeredAt'] != null
          ? DateTime.tryParse(json['registeredAt'] as String)
          : null,
      totalBought: (json['totalBuyAmount'] as num?)?.toDouble() ?? 0.0,
      totalSold: (json['totalSellAmount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] as String? ?? 'active',
      nic: json['nic'] as String?,
      address: json['address'] as String?,
      memberCode: json['memberCode'] as String?,
      area: json['area'] as String?,
      fieldVisitorId: json['fieldVisitorId'] as String?,
      fieldVisitorName: json['fieldVisitorName'] as String?,
      registrationData: json['registrationData'] is Map<String, dynamic>
          ? json['registrationData'] as Map<String, dynamic>
          : {},
      transactions:
          [], // Transactions are not returned in list view from NF backend for performance
    );
  }

  Map<String, dynamic> toJson() => {
    'id':
        id, // Map back to what backend expects if we send full object, though usually we send specific fields
    'name': name,
    'mobile': contact,
    'email': email,
    'dob': dob?.toIso8601String(),
    'registeredAt': joinedDate?.toIso8601String(),
    'status': status,
    'nic': nic,
    'address': address,
    'memberCode': memberCode,
    'area': area,
    'fieldVisitorId': fieldVisitorId,
    'fieldVisitorName': fieldVisitorName,
    'registrationData': registrationData,
  };

  Member copyWith({
    String? id,
    String? name,
    String? contact,
    String? email,
    DateTime? dob,
    DateTime? joinedDate,
    double? totalBought,
    double? totalSold,
    String? status,
    String? nic,
    String? address,
    String? memberCode,
    String? area,
    String? fieldVisitorId,
    String? fieldVisitorName,
    List<Transaction>? transactions,
    Map<String, dynamic>? registrationData,
  }) {
    return Member(
      id: id ?? this.id,
      name: name ?? this.name,
      contact: contact ?? this.contact,
      email: email ?? this.email,
      dob: dob ?? this.dob,
      joinedDate: joinedDate ?? this.joinedDate,
      totalBought: totalBought ?? this.totalBought,
      totalSold: totalSold ?? this.totalSold,
      status: status ?? this.status,
      nic: nic ?? this.nic,
      address: address ?? this.address,
      memberCode: memberCode ?? this.memberCode,
      area: area ?? this.area,
      fieldVisitorId: fieldVisitorId ?? this.fieldVisitorId,
      fieldVisitorName: fieldVisitorName ?? this.fieldVisitorName,
      transactions: transactions ?? this.transactions,
      registrationData: registrationData ?? this.registrationData,
    );
  }
}
