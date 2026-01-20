import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:path_provider/path_provider.dart';
import 'dart:io';
import 'package:google_fonts/google_fonts.dart';

import '../services/member_service.dart';
import '../services/transaction_service.dart';
import '../models/transaction.dart';

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
          title: Text(
            isEdit ? 'Edit Member' : 'Add Member',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!isEdit)
                  TextField(
                    controller: idCtrl,
                    style: GoogleFonts.outfit(),
                    decoration: InputDecoration(
                      labelText: 'Member ID (e.g. M123456)',
                      labelStyle: GoogleFonts.outfit(),
                      border: const OutlineInputBorder(),
                    ),
                  ),
                const SizedBox(height: 8),
                TextField(
                  controller: nameCtrl,
                  style: GoogleFonts.outfit(),
                  decoration: InputDecoration(
                    labelText: 'Full name',
                    labelStyle: GoogleFonts.outfit(),
                    border: const OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: contactCtrl,
                  keyboardType: TextInputType.phone,
                  style: GoogleFonts.outfit(),
                  decoration: InputDecoration(
                    labelText: 'Contact (Phone)',
                    labelStyle: GoogleFonts.outfit(),
                    border: const OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  style: GoogleFonts.outfit(),
                  decoration: InputDecoration(
                    labelText: 'Email address',
                    labelStyle: GoogleFonts.outfit(),
                    border: const OutlineInputBorder(),
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
                          style: GoogleFonts.outfit(),
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
                          style: GoogleFonts.outfit(),
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
              child: Text('Cancel', style: GoogleFonts.outfit()),
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
              child: Text(
                'Save',
                style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
              ),
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
                    Text('Members', style: GoogleFonts.outfit(fontSize: 14)),
                    const SizedBox(height: 6),
                    Text(
                      '$total',
                      style: GoogleFonts.outfit(
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
      builder: (c) => Dialog(
        backgroundColor: Colors.grey[200], // Background to contrast "paper"
        insetPadding: const EdgeInsets.all(10),
        child: Container(
          width: 500, // Max width for "A4" feel on tablets/desktop
          constraints: const BoxConstraints(maxHeight: 800),
          child: Column(
            children: [
              // Toolbar
              Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Print Preview',
                      style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
                    ),
                    Row(
                      children: [
                        TextButton.icon(
                          icon: const Icon(Icons.edit),
                          label: const Text('Edit'),
                          onPressed: () {
                            Navigator.of(c).pop();
                            _openAddEditDialog(member: member);
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.of(c).pop(),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              // "Paper" View
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.1),
                          blurRadius: 10,
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Header with Logo
                        Row(
                          children: [
                            Container(
                              width: 60,
                              height: 60,
                              decoration: BoxDecoration(
                                image: const DecorationImage(
                                  image: AssetImage('assets/nf logo.jpg'),
                                  fit: BoxFit.contain,
                                ),
                                border: Border.all(color: Colors.grey.shade300),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'NATURE FARMING',
                                    style: GoogleFonts.outfit(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.green[800],
                                    ),
                                  ),
                                  Text(
                                    'Member Profile Report',
                                    style: GoogleFonts.outfit(
                                      fontSize: 16,
                                      color: Colors.grey[700],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  DateFormat(
                                    'yyyy-MM-dd',
                                  ).format(DateTime.now()),
                                  style: GoogleFonts.outfit(fontSize: 12),
                                ),
                                Text(
                                  'Generated',
                                  style: GoogleFonts.outfit(
                                    fontSize: 10,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        const Divider(thickness: 2, color: Colors.green),
                        const SizedBox(height: 16),
                        // Member Details Grid
                        Text(
                          'MEMBER DETAILS',
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[600],
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Table(
                          columnWidths: const {
                            0: IntrinsicColumnWidth(),
                            1: FlexColumnWidth(),
                          },
                          children: [
                            _buildInfoRow('Member ID', member.id),
                            _buildInfoRow('Full Name', member.name),
                            _buildInfoRow('Contact', member.contact),
                            _buildInfoRow('Email', member.email),
                            _buildInfoRow(
                              'Joined Date',
                              member.joinedDate != null
                                  ? DateFormat(
                                      'yyyy-MM-dd',
                                    ).format(member.joinedDate!)
                                  : '-',
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        // Financial Summary
                        Row(
                          children: [
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                color: Colors.green[50],
                                child: Column(
                                  children: [
                                    Text(
                                      'Total Bought',
                                      style: GoogleFonts.outfit(
                                        fontSize: 12,
                                        color: Colors.green,
                                      ),
                                    ),
                                    Text(
                                      'LKR ${member.totalBought.toStringAsFixed(2)}',
                                      style: GoogleFonts.outfit(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.green[800],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                color: Colors.orange[50],
                                child: Column(
                                  children: [
                                    Text(
                                      'Total Sold',
                                      style: GoogleFonts.outfit(
                                        fontSize: 12,
                                        color: Colors.orange,
                                      ),
                                    ),
                                    Text(
                                      'LKR ${member.totalSold.toStringAsFixed(2)}',
                                      style: GoogleFonts.outfit(
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.orange[800],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'TRANSACTION HISTORY',
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                            color: Colors.grey[600],
                            letterSpacing: 1.2,
                          ),
                        ),
                        const SizedBox(height: 8),
                        FutureBuilder<List<Transaction>>(
                          future: TransactionService.getTransactions(
                            memberId: member.id,
                          ),
                          builder: (context, snapshot) {
                            if (!snapshot.hasData) {
                              return const Center(
                                child: CircularProgressIndicator(),
                              );
                            }
                            final txs = snapshot.data!;
                            if (txs.isEmpty) {
                              return Padding(
                                padding: const EdgeInsets.all(8.0),
                                child: Text(
                                  'No transactions recorded.',
                                  style: GoogleFonts.outfit(
                                    fontStyle: FontStyle.italic,
                                  ),
                                ),
                              );
                            }
                            return Table(
                              border: TableBorder.all(color: Colors.grey[300]!),
                              children: [
                                TableRow(
                                  decoration: BoxDecoration(
                                    color: Colors.grey[100],
                                  ),
                                  children: [
                                    _buildHeaderCell('Date'),
                                    _buildHeaderCell('Type'),
                                    _buildHeaderCell('Desc'),
                                    _buildHeaderCell(
                                      'Amount',
                                      alignRight: true,
                                    ),
                                  ],
                                ),
                                ...txs.map(
                                  (t) => TableRow(
                                    children: [
                                      _buildCell(
                                        DateFormat('yyyy-MM-dd').format(t.date),
                                      ),
                                      _buildCell(t.type.toUpperCase()),
                                      _buildCell(t.description),
                                      _buildCell(
                                        t.amount.toStringAsFixed(2),
                                        alignRight: true,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              // Print Action
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue[800],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.all(16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    icon: const Icon(Icons.print),
                    label: const Text('PRINT TO PDF'),
                    onPressed: () => _generateAndDownloadPdf(member),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  TableRow _buildInfoRow(String label, String value) {
    return TableRow(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 4.0, horizontal: 8.0),
          child: Text(
            label,
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.bold,
              color: Colors.grey[700],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 4.0),
          child: Text(value, style: GoogleFonts.outfit()),
        ),
      ],
    );
  }

  Widget _buildHeaderCell(String text, {bool alignRight = false}) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Text(
        text,
        style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 12),
        textAlign: alignRight ? TextAlign.right : TextAlign.left,
      ),
    );
  }

  Widget _buildCell(String text, {bool alignRight = false}) {
    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Text(
        text,
        style: GoogleFonts.outfit(fontSize: 12),
        textAlign: alignRight ? TextAlign.right : TextAlign.left,
      ),
    );
  }

  Future<void> _generateAndDownloadPdf(Member member) async {
    try {
      final transactions = await TransactionService.getTransactions(
        memberId: member.id,
      );
      final pdf = pw.Document();

      // Load Logo
      final logoImage = pw.MemoryImage(
        (await rootBundle.load('assets/nf logo.jpg')).buffer.asUint8List(),
      );

      // Current Date
      final dateStr = DateFormat('yyyy-MM-dd').format(DateTime.now());

      pdf.addPage(
        pw.MultiPage(
          pageFormat: PdfPageFormat.a4,
          margin: const pw.EdgeInsets.all(32),
          build: (pw.Context context) {
            return [
              // Header
              pw.Row(
                crossAxisAlignment: pw.CrossAxisAlignment.center,
                children: [
                  pw.Container(
                    width: 60,
                    height: 60,
                    child: pw.Image(logoImage),
                  ),
                  pw.SizedBox(width: 16),
                  pw.Expanded(
                    child: pw.Column(
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Text(
                          'NATURE FARMING',
                          style: pw.TextStyle(
                            fontSize: 20,
                            fontWeight: pw.FontWeight.bold,
                            color: PdfColors.green800,
                          ),
                        ),
                        pw.Text(
                          'Member Profile Report',
                          style: const pw.TextStyle(
                            fontSize: 16,
                            color: PdfColors.grey700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text(dateStr, style: const pw.TextStyle(fontSize: 12)),
                      pw.Text(
                        'Generated',
                        style: const pw.TextStyle(
                          fontSize: 10,
                          color: PdfColors.grey,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              pw.SizedBox(height: 20),
              pw.Divider(color: PdfColors.green, thickness: 2),
              pw.SizedBox(height: 20),

              // Details
              pw.Text(
                'MEMBER DETAILS',
                style: pw.TextStyle(
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.grey600,
                  letterSpacing: 1.2,
                ),
              ),
              pw.SizedBox(height: 10),
              pw.Table(
                columnWidths: const {
                  0: pw.IntrinsicColumnWidth(),
                  1: pw.FlexColumnWidth(),
                },
                children: [
                  _buildPdfInfoRow('Member ID', member.id),
                  _buildPdfInfoRow('Full Name', member.name),
                  _buildPdfInfoRow('Contact', member.contact),
                  _buildPdfInfoRow('Email', member.email),
                  _buildPdfInfoRow(
                    'Joined Date',
                    member.joinedDate != null
                        ? DateFormat('yyyy-MM-dd').format(member.joinedDate!)
                        : '-',
                  ),
                ],
              ),
              pw.SizedBox(height: 20),

              // Financial
              pw.Row(
                children: [
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(10),
                      color: PdfColors.green50,
                      child: pw.Column(
                        children: [
                          pw.Text(
                            'Total Bought',
                            style: const pw.TextStyle(
                              fontSize: 10,
                              color: PdfColors.green,
                            ),
                          ),
                          pw.Text(
                            'LKR ${member.totalBought.toStringAsFixed(2)}',
                            style: pw.TextStyle(
                              fontSize: 14,
                              fontWeight: pw.FontWeight.bold,
                              color: PdfColors.green800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  pw.SizedBox(width: 10),
                  pw.Expanded(
                    child: pw.Container(
                      padding: const pw.EdgeInsets.all(10),
                      color: PdfColors.orange50,
                      child: pw.Column(
                        children: [
                          pw.Text(
                            'Total Sold',
                            style: const pw.TextStyle(
                              fontSize: 10,
                              color: PdfColors.orange,
                            ),
                          ),
                          pw.Text(
                            'LKR ${member.totalSold.toStringAsFixed(2)}',
                            style: pw.TextStyle(
                              fontSize: 14,
                              fontWeight: pw.FontWeight.bold,
                              color: PdfColors.orange800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              pw.SizedBox(height: 20),
              pw.Text(
                'TRANSACTION HISTORY',
                style: pw.TextStyle(
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.grey600,
                  letterSpacing: 1.2,
                ),
              ),
              pw.SizedBox(height: 10),

              // Table
              if (transactions.isEmpty)
                pw.Text(
                  'No transactions recorded.',
                  style: pw.TextStyle(fontStyle: pw.FontStyle.italic),
                )
              else
                pw.TableHelper.fromTextArray(
                  headerDecoration: const pw.BoxDecoration(
                    color: PdfColors.grey100,
                  ),
                  headerHeight: 25,
                  cellHeight: 30,
                  cellAlignments: {
                    0: pw.Alignment.centerLeft,
                    1: pw.Alignment.centerLeft,
                    2: pw.Alignment.centerLeft,
                    3: pw.Alignment.centerRight,
                  },
                  headers: ['Date', 'Type', 'Desc', 'Amount (LKR)'],
                  data: transactions.map((t) {
                    return [
                      DateFormat('yyyy-MM-dd').format(t.date),
                      t.type.toUpperCase(),
                      t.description,
                      t.amount.toStringAsFixed(2),
                    ];
                  }).toList(),
                ),
            ];
          },
        ),
      );

      final directory = await getDownloadsDirectory();
      // Safe filename
      final safeName = member.name.replaceAll(RegExp(r'[^\w\s]+'), '');
      final fileName =
          'MemberReport_${safeName}_${DateTime.now().millisecondsSinceEpoch}.pdf';
      final file = File('${directory?.path}/$fileName');
      await file.writeAsBytes(await pdf.save());

      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Report Saved: $fileName')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  pw.TableRow _buildPdfInfoRow(String label, String value) {
    return pw.TableRow(
      children: [
        pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 5),
          child: pw.Text(
            label,
            style: pw.TextStyle(
              fontWeight: pw.FontWeight.bold,
              color: PdfColors.grey700,
            ),
          ),
        ),
        pw.Padding(
          padding: const pw.EdgeInsets.only(bottom: 5),
          child: pw.Text(value),
        ),
      ],
    );
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
      appBar: AppBar(
        title: Text(
          'Members',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
      ),
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
                    style: GoogleFonts.outfit(),
                    decoration: InputDecoration(
                      labelText: 'Search by Member ID (e.g. M123456)',
                      labelStyle: GoogleFonts.outfit(),
                      border: const OutlineInputBorder(),
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
                            style: GoogleFonts.outfit(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        title: Text(
                          m.name,
                          style: GoogleFonts.outfit(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        subtitle: Text(
                          'Bought: LKR ${m.totalBought.toStringAsFixed(2)} | Sold: LKR ${m.totalSold.toStringAsFixed(2)}\n${m.contact}',
                          style: GoogleFonts.outfit(color: Colors.grey[700]),
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
        heroTag: 'member_fab',
        onPressed: () => _openAddEditDialog(),
        child: const Icon(Icons.add),
      ),
    );
  }
}

class _SimpleLineChart extends StatelessWidget {
  final List<int> points;
  const _SimpleLineChart({required this.points});

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
    const minVal = 0.0;
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
