class Transaction {
  final DateTime date;
  final double amount;
  final String type; // 'buy' or 'sell'
  final String description;
  final String product; // product name or details

  final String id;
  final String status; // 'pending', 'approved', 'rejected'
  final String? approvedBy;
  final DateTime? approvedAt;
  final double quantity;
  final String unit;
  final double unitPrice;

  final String memberName;
  final String fvId;
  final String billNumber;

  Transaction({
    this.id = '', // Default empty if not from DB
    required this.date,
    required this.amount,
    required this.type,
    required this.description,
    required this.product,
    this.status = 'approved', // Default approved for low value
    this.approvedBy,
    this.approvedAt,
    this.quantity = 0.0,
    this.unit = '',
    this.unitPrice = 0.0,
    this.memberName = 'N/A',
    this.fvId = 'N/A',
    this.billNumber = '',
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['_id'] as String? ?? '', // Map MongoDB _id
      date: DateTime.parse(json['date'] as String).toLocal(),
      amount:
          (json['totalAmount'] as num?)?.toDouble() ??
          (json['amount'] as num?)?.toDouble() ??
          0.0,
      type: json['type'] as String? ?? 'buy',
      description:
          json['note'] as String? ??
          json['description'] as String? ??
          'Transaction for ${json['productName'] ?? 'Product'}',
      product:
          json['productName'] as String? ??
          json['product'] as String? ??
          'Unknown Product',
      status: json['status'] as String? ?? 'approved',
      approvedBy: json['approvedBy'] as String?,
      approvedAt: json['approvedAt'] != null
          ? DateTime.tryParse(json['approvedAt'] as String)?.toLocal()
          : null,
      quantity: (json['quantity'] as num?)?.toDouble() ?? 0.0,
      unit: json['unitType'] as String? ?? '',
      unitPrice: (json['unitPrice'] as num?)?.toDouble() ?? 0.0,
      memberName: (json['memberId'] is Map)
          ? (json['memberId']['name'] as String? ?? 'N/A')
          : 'N/A',
      fvId: (json['fieldVisitorId'] is Map)
          ? (json['fieldVisitorId']['userId'] as String? ?? 'N/A')
          : 'N/A',
      billNumber: json['billNumber'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'date': date.toIso8601String(),
    'amount': amount,
    'type': type,
    'description': description,
    'product': product,
    'status': status,
    'approvedBy': approvedBy,
    'approvedAt': approvedAt?.toIso8601String(),
  };

  bool get isHighValue => amount > 50000;
  bool get isPending => status == 'pending';
}
