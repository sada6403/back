import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:path_provider/path_provider.dart';
import 'dart:io';

import '../services/member_service.dart';

class MembersPage extends StatefulWidget {
  const MembersPage({super.key});

  @override
  State<MembersPage> createState() => _MembersPageState();
}

class _MembersPageState extends State<MembersPage> {
  final TextEditingController _searchCtrl = TextEditingController();
  String? _filterId;

  @override
  void initState() {
    super.initState();
    MemberService.init().then((_) {
      setState(() {});
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _openAddEditDialog({Member? member}) async {
    final isEdit = member != null;
    final idCtrl = TextEditingController(text: member?.id ?? '');
    final nameCtrl = TextEditingController(text: member?.name ?? '');
    final contactCtrl = TextEditingController(text: member?.contact ?? '');
    final emailCtrl = TextEditingController(text: member?.email ?? '');
    DateTime? dob = member?.dob;
    DateTime? joinedDate = member?.joinedDate;

    await showDialog<void>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text(isEdit ? 'Edit Member' : 'Add Member'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!isEdit)
                  TextField(
                    controller: idCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Member ID (e.g. M123456)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                const SizedBox(height: 8),
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Full name',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: contactCtrl,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Contact (Phone)',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                    labelText: 'Email address',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: dob ?? DateTime(1990, 1, 1),
                      firstDate: DateTime(1900),
                      lastDate: DateTime.now(),
                    );
                    if (picked != null) setState(() => dob = picked);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          dob != null
                              ? DateFormat('yyyy-MM-dd').format(dob!)
                              : 'Date of Birth',
                        ),
                        const Icon(Icons.calendar_today, color: Colors.blue),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: joinedDate ?? DateTime.now(),
                      firstDate: DateTime(2000),
                      lastDate: DateTime.now(),
                    );
                    if (picked != null) setState(() => joinedDate = picked);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          joinedDate != null
                              ? DateFormat('yyyy-MM-dd').format(joinedDate!)
                              : 'Joined Date',
                        ),
                        const Icon(Icons.calendar_today, color: Colors.blue),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                final idVal = idCtrl.text.trim();
                final name = nameCtrl.text.trim();
                final contact = contactCtrl.text.trim();
                final email = emailCtrl.text.trim();

                if (!isEdit && idVal.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Member ID is required')),
                  );
                  return;
                }
                if (name.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Name is required')),
                  );
                  return;
                }
                if (contact.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Contact is required')),
                  );
                  return;
                }

                if (isEdit) {
                  final updated = Member(
                    id: member.id,
                    name: name,
                    contact: contact,
                    email: email,
                    dob: dob,
                    joinedDate: joinedDate,
                    totalBought: member.totalBought,
                    totalSold: member.totalSold,
                    transactions: member.transactions,
                  );
                  MemberService.updateMember(member.id, updated);
                } else {
                  // uniqueness check
                  final exists = MemberService.getMembers().any(
                    (m) => m.id.toLowerCase() == idVal.toLowerCase(),
                  );
                  if (exists) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Member ID already exists')),
                    );
                    return;
                  }

                  final created = MemberService.create(
                    id: idVal,
                    name: name,
                    contact: contact,
                    email: email,
                    dob: dob,
                    joinedDate: joinedDate,
                  );
                  MemberService.addMember(created);
                }

                setState(() {});
                Navigator.of(context).pop();
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }

  List<int> _monthlyNewMembers() {
    final now = DateTime.now();
    final counts = List<int>.filled(12, 0);
    final members = MemberService.getMembers();
    for (final m in members) {
      final jd = m.joinedDate;
      if (jd == null) continue;
      for (int i = 0; i < 12; i++) {
        final monthDate = DateTime(now.year, now.month - 11 + i, 1);
        if (jd.year == monthDate.year && jd.month == monthDate.month) {
          counts[i] += 1;
        }
      }
    }
    return counts;
  }

  Widget _buildHeaderSummary() {
    final total = MemberService.getMembers().length;
    final series = _monthlyNewMembers();
    return Card(
      margin: const EdgeInsets.all(12),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Members', style: TextStyle(fontSize: 14)),
                    const SizedBox(height: 6),
                    Text(
                      '$total',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                SizedBox(
                  width: 200,
                  height: 80,
                  child: _SimpleLineChart(points: series),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showMemberDetails(Member member) {
    showDialog<void>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(member.name),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Contact: ${member.contact}'),
              const SizedBox(height: 6),
              Text(
                'Total Bought: LKR ${member.totalBought.toStringAsFixed(2)}',
              ),
              const SizedBox(height: 6),
              Text('Total Sold: LKR ${member.totalSold.toStringAsFixed(2)}'),
              const SizedBox(height: 12),
              const Text(
                'Transaction History:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              if (member.transactions.isEmpty)
                const Text(
                  'No transactions',
                  style: TextStyle(color: Colors.grey),
                )
              else
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: member.transactions.map((t) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4.0),
                      child: Text(
                        '${t.type.toUpperCase()}: LKR ${t.amount.toStringAsFixed(2)} - ${t.description}\n${DateFormat('yyyy-MM-dd HH:mm').format(t.date)}',
                        style: const TextStyle(fontSize: 12),
                      ),
                    );
                  }).toList(),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(c).pop(),
            child: const Text('Close'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(c).pop();
              _openAddEditDialog(member: member);
            },
            child: const Text('Edit'),
          ),
        ],
      ),
    );
  }

  Future<void> _generateAndDownloadPdf(Member member) async {
    try {
      final pdf = pw.Document();

      pdf.addPage(
        pw.Page(
          build: (pw.Context context) {
            return pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.start,
              children: [
                pw.Text(
                  'Member Report: ${member.name}',
                  style: pw.TextStyle(
                    fontSize: 20,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 12),
                pw.Text('Contact: ${member.contact}'),
                pw.SizedBox(height: 6),
                pw.Text(
                  'Total Bought: LKR ${member.totalBought.toStringAsFixed(2)}',
                ),
                pw.SizedBox(height: 6),
                pw.Text(
                  'Total Sold: LKR ${member.totalSold.toStringAsFixed(2)}',
                ),
                pw.SizedBox(height: 6),
                pw.Text(
                  'Report Date: ${DateFormat('yyyy-MM-dd HH:mm').format(DateTime.now())}',
                ),
                pw.SizedBox(height: 20),
                pw.Text(
                  'Transaction History:',
                  style: pw.TextStyle(
                    fontSize: 14,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                pw.SizedBox(height: 12),
                if (member.transactions.isEmpty)
                  pw.Text('No transactions')
                else
                  pw.TableHelper.fromTextArray(
                    headers: ['Date', 'Type', 'Amount (LKR)', 'Description'],
                    data: member.transactions.map((t) {
                      return [
                        DateFormat('yyyy-MM-dd HH:mm').format(t.date),
                        t.type.toUpperCase(),
                        t.amount.toStringAsFixed(2),
                        t.description,
                      ];
                    }).toList(),
                  ),
              ],
            );
          },
        ),
      );

      final directory = await getDownloadsDirectory();
      final fileName =
          'member_report_${member.name}_${DateTime.now().millisecondsSinceEpoch}.pdf';
      final file = File('${directory?.path}/$fileName');
      await file.writeAsBytes(await pdf.save());

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('PDF saved to Downloads: $fileName')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error generating PDF: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final members = MemberService.getMembers();
    final displayedMembers = (_filterId == null || _filterId!.isEmpty)
        ? members
        : members
              .where((m) => m.id.toLowerCase() == _filterId!.toLowerCase())
              .toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Members')),
      body: Column(
        children: [
          _buildHeaderSummary(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Search by Member ID (e.g. M123456)',
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (v) => setState(() => _filterId = v.trim()),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () {
                    _searchCtrl.clear();
                    setState(() => _filterId = null);
                  },
                  icon: const Icon(Icons.clear),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: displayedMembers.length,
              itemBuilder: (context, i) {
                final m = displayedMembers[i];
                return Card(
                  child: Column(
                    children: [
                      ListTile(
                        onTap: () => _showMemberDetails(m),
                        leading: CircleAvatar(
                          backgroundColor: Colors.green,
                          child: Text(
                            m.name[0].toUpperCase(),
                            style: const TextStyle(color: Colors.white),
                          ),
                        ),
                        title: Text(m.name),
                        subtitle: Text(
                          'Bought: LKR ${m.totalBought.toStringAsFixed(2)} | Sold: LKR ${m.totalSold.toStringAsFixed(2)}\n${m.contact}',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        isThreeLine: true,
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(
                                Icons.remove_red_eye,
                                color: Colors.grey,
                              ),
                              onPressed: () => _showMemberDetails(m),
                            ),
                            IconButton(
                              icon: const Icon(
                                Icons.download,
                                color: Colors.blue,
                              ),
                              onPressed: () => _generateAndDownloadPdf(m),
                            ),
                            IconButton(
                              icon: const Icon(Icons.edit, color: Colors.blue),
                              onPressed: () => _openAddEditDialog(member: m),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete, color: Colors.red),
                              onPressed: () async {
                                final ok = await showDialog<bool>(
                                  context: context,
                                  builder: (c) => AlertDialog(
                                    title: const Text('Delete'),
                                    content: const Text('Delete this member?'),
                                    actions: [
                                      TextButton(
                                        onPressed: () =>
                                            Navigator.of(c).pop(false),
                                        child: const Text('Cancel'),
                                      ),
                                      TextButton(
                                        onPressed: () =>
                                            Navigator.of(c).pop(true),
                                        child: const Text('Delete'),
                                      ),
                                    ],
                                  ),
                                );
                                if (ok == true) {
                                  MemberService.deleteMember(m.id);
                                  setState(() {});
                                }
                              },
                            ),
                          ],
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12.0,
                          vertical: 8.0,
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                icon: const Icon(Icons.shopping_cart),
                                label: const Text('Add Buy'),
                                onPressed: () {
                                  final amountCtrl = TextEditingController();
                                  final descCtrl = TextEditingController();
                                  final productCtrl = TextEditingController();

                                  showDialog<void>(
                                    context: context,
                                    builder: (c) {
                                      return AlertDialog(
                                        title: const Text(
                                          'Add Buy Transaction',
                                        ),
                                        content: SingleChildScrollView(
                                          child: Column(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              TextField(
                                                controller: amountCtrl,
                                                keyboardType:
                                                    TextInputType.number,
                                                decoration:
                                                    const InputDecoration(
                                                      labelText: 'Amount (LKR)',
                                                      border:
                                                          OutlineInputBorder(),
                                                    ),
                                              ),
                                              const SizedBox(height: 8),
                                              TextField(
                                                controller: descCtrl,
                                                decoration:
                                                    const InputDecoration(
                                                      labelText: 'Description',
                                                      border:
                                                          OutlineInputBorder(),
                                                    ),
                                              ),
                                              const SizedBox(height: 8),
                                              TextField(
                                                controller: productCtrl,
                                                decoration:
                                                    const InputDecoration(
                                                      labelText:
                                                          'Product (optional)',
                                                      border:
                                                          OutlineInputBorder(),
                                                    ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () =>
                                                Navigator.of(c).pop(),
                                            child: const Text('Cancel'),
                                          ),
                                          TextButton(
                                            onPressed: () {
                                              final amount =
                                                  double.tryParse(
                                                    amountCtrl.text.trim(),
                                                  ) ??
                                                  0.0;
                                              final desc = descCtrl.text.trim();
                                              final product = productCtrl.text
                                                  .trim();

                                              if (amount <= 0) {
                                                ScaffoldMessenger.of(
                                                  context,
                                                ).showSnackBar(
                                                  const SnackBar(
                                                    content: Text(
                                                      'Amount must be positive',
                                                    ),
                                                  ),
                                                );
                                                return;
                                              }
                                              if (desc.isEmpty) {
                                                ScaffoldMessenger.of(
                                                  context,
                                                ).showSnackBar(
                                                  const SnackBar(
                                                    content: Text(
                                                      'Description is required',
                                                    ),
                                                  ),
                                                );
                                                return;
                                              }

                                              MemberService.addTransaction(
                                                m.id,
                                                amount: amount,
                                                type: 'buy',
                                                description: desc,
                                                product: product,
                                              );

                                              setState(() {});
                                              Navigator.of(c).pop();
                                            },
                                            child: const Text('Add'),
                                          ),
                                        ],
                                      );
                                    },
                                  );
                                },
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: ElevatedButton.icon(
                                icon: const Icon(Icons.local_shipping),
                                label: const Text('Add Sell'),
                                onPressed: () {
                                  final amountCtrl = TextEditingController();
                                  final descCtrl = TextEditingController();
                                  final productCtrl = TextEditingController();

                                  showDialog<void>(
                                    context: context,
                                    builder: (c) {
                                      return AlertDialog(
                                        title: const Text(
                                          'Add Sell Transaction',
                                        ),
                                        content: SingleChildScrollView(
                                          child: Column(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              TextField(
                                                controller: amountCtrl,
                                                keyboardType:
                                                    TextInputType.number,
                                                decoration:
                                                    const InputDecoration(
                                                      labelText: 'Amount (LKR)',
                                                      border:
                                                          OutlineInputBorder(),
                                                    ),
                                              ),
                                              const SizedBox(height: 8),
                                              TextField(
                                                controller: descCtrl,
                                                decoration:
                                                    const InputDecoration(
                                                      labelText: 'Description',
                                                      border:
                                                          OutlineInputBorder(),
                                                    ),
                                              ),
                                              const SizedBox(height: 8),
                                              TextField(
                                                controller: productCtrl,
                                                decoration:
                                                    const InputDecoration(
                                                      labelText:
                                                          'Product (optional)',
                                                      border:
                                                          OutlineInputBorder(),
                                                    ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () =>
                                                Navigator.of(c).pop(),
                                            child: const Text('Cancel'),
                                          ),
                                          TextButton(
                                            onPressed: () {
                                              final amount =
                                                  double.tryParse(
                                                    amountCtrl.text.trim(),
                                                  ) ??
                                                  0.0;
                                              final desc = descCtrl.text.trim();
                                              final product = productCtrl.text
                                                  .trim();

                                              if (amount <= 0) {
                                                ScaffoldMessenger.of(
                                                  context,
                                                ).showSnackBar(
                                                  const SnackBar(
                                                    content: Text(
                                                      'Amount must be positive',
                                                    ),
                                                  ),
                                                );
                                                return;
                                              }
                                              if (desc.isEmpty) {
                                                ScaffoldMessenger.of(
                                                  context,
                                                ).showSnackBar(
                                                  const SnackBar(
                                                    content: Text(
                                                      'Description is required',
                                                    ),
                                                  ),
                                                );
                                                return;
                                              }

                                              MemberService.addTransaction(
                                                m.id,
                                                amount: amount,
                                                type: 'sell',
                                                description: desc,
                                                product: product,
                                              );

                                              setState(() {});
                                              Navigator.of(c).pop();
                                            },
                                            child: const Text('Add'),
                                          ),
                                        ],
                                      );
                                    },
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openAddEditDialog(),
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _SimpleLineChart extends StatelessWidget {
  final List<int> points;
  const _SimpleLineChart({super.key, required this.points});

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _LineChartPainter(points),
      size: const Size(double.infinity, double.infinity),
    );
  }
}

class _LineChartPainter extends CustomPainter {
  final List<int> points;
  _LineChartPainter(this.points);

  @override
  void paint(Canvas canvas, Size size) {
    final paintLine = Paint()
      ..color = Colors.blue
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke
      ..isAntiAlias = true;

    final paintDot = Paint()
      ..color = Colors.blue
      ..style = PaintingStyle.fill
      ..isAntiAlias = true;

    if (points.isEmpty) return;

    final maxVal = points.reduce((a, b) => a > b ? a : b).toDouble();
    final minVal = 0.0;
    final span = (maxVal - minVal) == 0 ? 1.0 : (maxVal - minVal);

    final stepX = size.width / (points.length - 1).clamp(1, double.infinity);

    final path = Path();
    for (int i = 0; i < points.length; i++) {
      final x = stepX * i;
      final normalized = (points[i] - minVal) / span;
      final y = size.height - (normalized * size.height);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
      canvas.drawCircle(Offset(x, y), 2.5, paintDot);
    }

    canvas.drawPath(path, paintLine);
  }

  @override
  bool shouldRepaint(covariant _LineChartPainter oldDelegate) {
    return oldDelegate.points != points;
  }
}
