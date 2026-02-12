import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import 'dart:io';
import 'package:google_fonts/google_fonts.dart';

import '../services/member_service.dart';
import '../services/audit_service.dart';
import '../services/transaction_service.dart';
import '../services/auth_service.dart';

import 'package:file_picker/file_picker.dart';
import 'package:printing/printing.dart';

enum SortOption { recent, oldest, highestBought, highestSold }

class MembersPage extends StatefulWidget {
  const MembersPage({super.key});

  @override
  State<MembersPage> createState() => _MembersPageState();
}

class _MembersPageState extends State<MembersPage> {
  final TextEditingController _searchCtrl = TextEditingController();
  SortOption _sortOption = SortOption.recent;

  @override
  void initState() {
    super.initState();
    MemberService.init().then((_) {
      setState(() {});
    });
  }

  Timer? _debounce;
  final List<_InlineMemberRow> _newRows = [];
  String? _editingMemberId;
  _InlineMemberRow? _editingRow;

  @override
  void dispose() {
    _searchCtrl.dispose();
    _debounce?.cancel();
    for (var r in _newRows) {
      r.dispose();
    }
    super.dispose();
  }

  void _startEditing(Member member) {
    if (_editingRow != null) {
      _editingRow!.dispose();
    }
    setState(() {
      _editingMemberId = member.id;
      _editingRow = _InlineMemberRow();
      _editingRow!.name.text = member.name;
      _editingRow!.contact.text = member.contact;
      _editingRow!.email.text = member.email;
      _editingRow!.nic.text = member.nic ?? '';
      _editingRow!.address.text = member.address ?? member.area ?? '';
      _editingRow!.fieldVisitorId.text = member.fieldVisitorId ?? '';
      _editingRow!.memberCode.text = member.memberCode ?? '';
      _editingRow!.dob = member.dob ?? DateTime(1990);
      _editingRow!.joinedDate = member.joinedDate ?? DateTime.now();
    });
  }

  Future<void> _saveEditing(Member originalMember) async {
    if (_editingRow == null) return;

    final updatedMember = originalMember.copyWith(
      name: _editingRow!.name.text,
      contact: _editingRow!.contact.text,
      email: _editingRow!.email.text,
      nic: _editingRow!.nic.text,
      address: _editingRow!.address.text,
      fieldVisitorId: _editingRow!.fieldVisitorId.text.isNotEmpty
          ? _editingRow!.fieldVisitorId.text
          : null,
      memberCode: _editingRow!.memberCode.text.isNotEmpty
          ? _editingRow!.memberCode.text
          : null,
      dob: _editingRow!.dob,
      joinedDate: _editingRow!.joinedDate,
    );

    try {
      await MemberService.updateMember(originalMember.id, updatedMember);
      AuditService.logAction(
        'Member Updated',
        'Updated Member: ${updatedMember.name} (Inline)',
        targetUser: updatedMember.name,
      );
      if (!mounted) return;
      _cancelEditing();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Member ${updatedMember.name} updated!'),
          backgroundColor: Colors.green,
        ),
      );
      setState(() {});
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _cancelEditing() {
    setState(() {
      _editingMemberId = null;
      if (_editingRow != null) {
        _editingRow!.dispose();
        _editingRow = null;
      }
    });
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () async {
      await MemberService.fetchMembers(query: query);
      setState(() {});
    });
  }

  Widget _buildInlineField(
    TextEditingController ctrl,
    String hint, {
    bool isPhone = false,
    double? width,
  }) {
    return SizedBox(
      width: width ?? 100,
      height: 35,
      child: TextField(
        controller: ctrl,
        keyboardType: isPhone ? TextInputType.phone : TextInputType.text,
        style: GoogleFonts.outfit(color: Colors.white, fontSize: 13),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.outfit(color: Colors.white30, fontSize: 11),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 8,
            vertical: 0,
          ),
          filled: true,
          fillColor: Colors.black26,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(4),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }

  Future<void> _saveInlineRow(_InlineMemberRow row, int index) async {
    if (row.name.text.isEmpty || row.contact.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Name and Contact are required!'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    try {
      final newMember = MemberService.create(
        id: 'M${DateTime.now().millisecondsSinceEpoch}',
        name: row.name.text,
        contact: row.contact.text,
        email: row.email.text,
      );

      final fullMember = newMember.copyWith(
        nic: row.nic.text,
        address: row.address.text,
        memberCode: row.memberCode.text,
        fieldVisitorId: row.fieldVisitorId.text.isNotEmpty
            ? row.fieldVisitorId.text
            : null,
      );

      await MemberService.addMember(fullMember);

      AuditService.logAction(
        'Member Created',
        'Created Member: ${row.name.text}',
        targetUser: row.name.text,
      );

      setState(() {
        // Remove from inline rows as it will be fetched in main list
        row.dispose();
        _newRows.removeAt(index);
      });

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Member ${row.name.text} added!'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  /* void _openAddEditDialog({Member? member}) async {
    return; /*
    final isEdit = member != null;
    final idCtrl = TextEditingController(text: member?.id ?? '');
    final nameCtrl = TextEditingController(text: member?.name ?? '');
    final contactCtrl = TextEditingController(text: member?.contact ?? '');
    final emailCtrl = TextEditingController(text: member?.email ?? '');
    DateTime? dob = member?.dob;
    DateTime? joinedDate = member?.joinedDate;
    String statusVal = member?.status ?? 'active'; // Default to active

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
                const SizedBox(height: 12),
                // Status Toggle
                Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey.shade300),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: SwitchListTile(
                    title: Text(
                      'Account Status',
                      style: GoogleFonts.outfit(fontSize: 14),
                    ),
                    subtitle: Text(
                      statusVal.toUpperCase(),
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: statusVal == 'active'
                            ? Colors.green
                            : Colors.red,
                      ),
                    ),
                    value: statusVal == 'active',
                    onChanged: (val) {
                      setState(() {
                        statusVal = val ? 'active' : 'suspended';
                      });
                    },
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
                  // Capture previous state for audit
                  final prevStatus = member.status;

                  final updated = Member(
                    id: member.id,
                    name: name,
                    memberCode: member.memberCode, // Preserve original code
                    contact: contact,
                    email: email,
                    dob: dob,
                    joinedDate: joinedDate,
                    totalBought: member.totalBought,
                    totalSold: member.totalSold,
                    transactions: member.transactions,
                    status: statusVal, // New status
                    nic: member.nic,
                    address: member.address,
                    fieldVisitorId: member.fieldVisitorId,
                    fieldVisitorName: member.fieldVisitorName,
                    area: member.area,
                  );

                  MemberService.updateMember(member.id, updated);

                  AuditService.logAction(
                    'Member Updated',
                    'Updated Member: $name (${member.id})${prevStatus != statusVal ? " Status changed to $statusVal" : ""}',
                    targetUser: name,
                  );
                } else {
                  // uniqueness check
                  final exists = MemberService.getMembers().any(
                    (m) =>
                        m.id.toLowerCase() == idVal.toLowerCase() ||
                        (m.memberCode != null &&
                            m.memberCode!.toLowerCase() == idVal.toLowerCase()),
                  );
                  if (exists) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Member ID/Code already exists'),
                      ),
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
                  // Apply manually set status if needed, though create() usually defaults to active
                  final msgParam = created.copyWith(
                    status: statusVal,
                  ); // Ensure status is set

                  MemberService.addMember(msgParam);

                  AuditService.logAction(
                    'Member Created',
                    'Created new Member: $name ($idVal)',
                    targetUser: name,
                  );
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
  */
  } */

  Future<void> _importExcel() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['xlsx'],
      );

      if (result == null || result.files.isEmpty) return;
      final path = result.files.single.path;
      if (path == null) return;

      if (!mounted) return;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (c) => const Center(child: CircularProgressIndicator()),
      );

      // Call Service (Server-side processing)
      final res = await MemberService.uploadBulkMembers(File(path));

      if (!mounted) return;
      Navigator.pop(context); // Close loading

      final success = res['results']['success'];
      final failed = res['results']['failed'];

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Upload Complete: $success success, $failed failed'),
          backgroundColor: failed > 0 ? Colors.orange : Colors.green,
        ),
      );

      // Refresh
      setState(() {});
    } catch (e) {
      if (!mounted) return;
      if (Navigator.canPop(context)) Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
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
      color: const Color(0xFF1F2937),
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
                    Text(
                      'Members',
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        color: Colors.grey[400],
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '$total',
                      style: GoogleFonts.outfit(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
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

  Future<void> _printMemberReport(Member member) async {
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
                  _buildPdfInfoRow(
                    'Member Code',
                    member.memberCode ?? member.id,
                  ),
                  _buildPdfInfoRow('Full Name', member.name),
                  _buildPdfInfoRow(
                    'Assigned To',
                    member.fieldVisitorName ?? 'Unknown',
                  ),
                  _buildPdfInfoRow('NIC', member.nic ?? '-'),
                  _buildPdfInfoRow(
                    'Address',
                    member.address ?? member.area ?? '-',
                  ),
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
                    4: pw.Alignment.centerRight,
                  },
                  headers: ['Date', 'Type', 'Desc', 'Qty', 'Amount (LKR)'],
                  data: transactions.map((t) {
                    return [
                      DateFormat('yyyy-MM-dd').format(t.date),
                      t.type.toUpperCase(),
                      t.description,
                      '${t.quantity} ${t.unit}',
                      t.amount.toStringAsFixed(2),
                    ];
                  }).toList(),
                ),
            ];
          },
        ),
      );

      await Printing.layoutPdf(
        onLayout: (PdfPageFormat format) async => pdf.save(),
        name: 'MemberReport_${member.name}',
      );
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

  List<Member> _getSortedMembers() {
    final members = MemberService.getMembers();
    switch (_sortOption) {
      case SortOption.recent:
        members.sort(
          (a, b) => (b.joinedDate ?? DateTime(2000)).compareTo(
            a.joinedDate ?? DateTime(2000),
          ),
        );
        break;
      case SortOption.oldest:
        members.sort(
          (a, b) => (a.joinedDate ?? DateTime(2000)).compareTo(
            b.joinedDate ?? DateTime(2000),
          ),
        );
        break;
      case SortOption.highestBought:
        members.sort((a, b) => b.totalBought.compareTo(a.totalBought));
        break;
      case SortOption.highestSold:
        members.sort((a, b) => b.totalSold.compareTo(a.totalSold));
        break;
    }
    return members;
  }

  void _showMemberDetails(Member member) {
    showDialog(
      context: context,
      builder: (context) {
        final data = member.registrationData;
        return AlertDialog(
          title: Text(
            '${member.name} - Details',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
          ),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 400,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildDetailRow('Resident DOB', data['resident_dob']),
                  _buildDetailRow('Education', data['resident_education']),
                  _buildDetailRow('Occupation', data['resident_occupation']),
                  const Divider(),
                  _buildDetailRow(
                    'Land Size',
                    '${data['landSize'] ?? '-'} acres',
                  ),
                  _buildDetailRow('Quantity Plants', data['quantityPlants']),
                  _buildDetailRow('Activity', data['activity']),
                  const Divider(),
                  _buildDetailRow('Water Facility', data['waterFacility']),
                  _buildDetailRow('Electricity', data['electricity']),
                  _buildDetailRow('Machinery', data['machinery']),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String? value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: GoogleFonts.outfit(
                fontWeight: FontWeight.bold,
                color: Colors.grey[700],
              ),
            ),
          ),
          Expanded(
            child: Text(
              value ?? '-',
              style: GoogleFonts.outfit(color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionIcon(
    IconData icon,
    Color color,
    VoidCallback onTap,
    String tooltip,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: IconButton(
        padding: EdgeInsets.zero,
        constraints: const BoxConstraints(),
        icon: Icon(icon, color: color, size: 20),
        onPressed: onTap,
        tooltip: tooltip,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Local filtering removed as service handles it

    return Scaffold(
      backgroundColor: const Color(0xFF111827),
      appBar: AppBar(
        title: Text(
          'Members',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF1F2937),
        iconTheme: const IconThemeData(color: Colors.white),
        titleTextStyle: const TextStyle(color: Colors.white, fontSize: 20),
        actions: [
          if (AuthService.role != 'analyzer')
            IconButton(
              icon: const Icon(Icons.file_upload),
              tooltip: 'Import Excel',
              onPressed: _importExcel,
            ),
        ],
      ),
      body: Column(
        children: [
          _buildHeaderSummary(),

          // Standardized Filter Row (Search + Sort)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  flex: 2,
                  child: TextField(
                    controller: _searchCtrl,
                    style: GoogleFonts.outfit(color: Colors.white),
                    decoration: InputDecoration(
                      labelText: 'Search by ID or Name',
                      labelStyle: GoogleFonts.outfit(color: Colors.grey),
                      filled: true,
                      fillColor: const Color(0xFF1F2937),
                      border: const OutlineInputBorder(),
                      prefixIcon: const Icon(Icons.search, color: Colors.grey),
                      contentPadding: const EdgeInsets.symmetric(
                        vertical: 0,
                        horizontal: 10,
                      ),
                    ),
                    onChanged: _onSearchChanged,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: InputDecorator(
                    decoration: const InputDecoration(
                      labelText: 'Sort By',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(
                        vertical: 0,
                        horizontal: 10,
                      ),
                      filled: true,
                      fillColor: Color(0xFF1F2937),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<SortOption>(
                        value: _sortOption,
                        isExpanded: true,
                        dropdownColor: const Color(0xFF1F2937),
                        style: GoogleFonts.outfit(color: Colors.white),
                        items: const [
                          DropdownMenuItem(
                            value: SortOption.recent,
                            child: Text('Newest First'),
                          ),
                          DropdownMenuItem(
                            value: SortOption.oldest,
                            child: Text('Oldest First'),
                          ),
                          DropdownMenuItem(
                            value: SortOption.highestBought,
                            child: Text('Highest Bought'),
                          ),
                          DropdownMenuItem(
                            value: SortOption.highestSold,
                            child: Text('Highest Sold'),
                          ),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _sortOption = val);
                        },
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () {
                    _searchCtrl.clear();
                    _onSearchChanged('');
                  },
                  icon: const Icon(Icons.clear, color: Colors.grey),
                  tooltip: 'Clear Filters',
                ),
              ],
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.vertical,
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowHeight: 70, // Prevent overflow
                  headingRowColor: WidgetStateProperty.all(
                    const Color(0xFF111827),
                  ),
                  dataRowMinHeight: 60,
                  dataRowMaxHeight: 60,
                  columnSpacing: 12, // Reduced from 20 to fix overflow
                  columns: [
                    DataColumn(
                      label: Text(
                        'CODE',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'NIC',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'FULL NAME',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'FV',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                      tooltip: 'Field Visitor',
                    ),
                    DataColumn(
                      label: Text(
                        'CONTACT',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'ADDRESS',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'EMAIL',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'LAND',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'PLANTS',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'JOINED',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'BOUGHT',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'SOLD',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          fontSize: 10,
                        ),
                      ),
                    ),
                    DataColumn(
                      label: Text(
                        'ACTIONS',
                        style: GoogleFonts.outfit(
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                  rows: [
                    ..._getSortedMembers().map((m) {
                      final isEditing =
                          _editingMemberId == m.id && _editingRow != null;
                      return DataRow(
                        color: isEditing
                            ? WidgetStateProperty.all(const Color(0xFF374151))
                            : null,
                        cells: isEditing
                            ? [
                                DataCell(
                                  _buildInlineField(
                                    _editingRow!.memberCode,
                                    'Code',
                                  ),
                                ),
                                DataCell(
                                  _buildInlineField(_editingRow!.nic, 'NIC'),
                                ),
                                DataCell(
                                  _buildInlineField(_editingRow!.name, 'Name'),
                                ),
                                DataCell(
                                  _buildInlineField(
                                    _editingRow!.fieldVisitorId,
                                    'FV Code',
                                  ),
                                ),
                                DataCell(
                                  _buildInlineField(
                                    _editingRow!.contact,
                                    'Phone',
                                    isPhone: true,
                                  ),
                                ),
                                DataCell(
                                  _buildInlineField(
                                    _editingRow!.address,
                                    'Address',
                                  ),
                                ),
                                DataCell(
                                  _buildInlineField(
                                    _editingRow!.email,
                                    'Email',
                                  ),
                                ),
                                const DataCell(SizedBox()), // Land
                                const DataCell(SizedBox()), // Plants
                                DataCell(
                                  Text(
                                    m.joinedDate != null
                                        ? DateFormat(
                                            'yyyy-MM-dd',
                                          ).format(m.joinedDate!)
                                        : '-',
                                    style: GoogleFonts.outfit(
                                      color: Colors.white70,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                                DataCell(
                                  Text(
                                    m.totalBought.toStringAsFixed(2),
                                    style: GoogleFonts.outfit(
                                      color: Colors.greenAccent,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                                DataCell(
                                  Text(
                                    m.totalSold.toStringAsFixed(2),
                                    style: GoogleFonts.outfit(
                                      color: Colors.orangeAccent,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                                DataCell(
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                        icon: const Icon(
                                          Icons.check,
                                          color: Colors.green,
                                        ),
                                        onPressed: () => _saveEditing(m),
                                        tooltip: 'Save',
                                      ),
                                      const SizedBox(width: 8),
                                      IconButton(
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(),
                                        icon: const Icon(
                                          Icons.close,
                                          color: Colors.red,
                                        ),
                                        onPressed: _cancelEditing,
                                        tooltip: 'Cancel',
                                      ),
                                    ],
                                  ),
                                ),
                              ]
                            : [
                                // Code
                                DataCell(
                                  Container(
                                    padding: const EdgeInsets.all(4),
                                    color: const Color(0xFF1F2937),
                                    child: Text(
                                      m.memberCode ?? '-',
                                      style: GoogleFonts.outfit(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ),
                                // NIC
                                DataCell(
                                  Container(
                                    padding: const EdgeInsets.all(4),
                                    color: const Color(0xFF1F2937),
                                    child: Text(
                                      m.nic ?? '-',
                                      style: GoogleFonts.outfit(
                                        color: Colors.white,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ),
                                // Name
                                DataCell(
                                  Container(
                                    width: 120, // Constrained width
                                    padding: const EdgeInsets.all(4),
                                    color: const Color(0xFF1F2937),
                                    child: Text(
                                      m.name,
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.outfit(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ),
                                // FV
                                DataCell(
                                  SizedBox(
                                    width: 80,
                                    child: Text(
                                      m.fieldVisitorId ?? '-',
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.outfit(
                                        color: Colors.white,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ),
                                // Contact
                                DataCell(
                                  Container(
                                    padding: const EdgeInsets.all(4),
                                    color: const Color(0xFF1F2937),
                                    child: Text(
                                      m.contact,
                                      style: GoogleFonts.outfit(
                                        color: Colors.white,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ),
                                // Address
                                DataCell(
                                  SizedBox(
                                    width: 100,
                                    child: Text(
                                      m.area ?? m.address ?? '-',
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.outfit(
                                        color: Colors.white,
                                        fontSize: 10,
                                      ),
                                    ),
                                  ),
                                ),
                                // Email
                                DataCell(
                                  SizedBox(
                                    width: 100,
                                    child: Text(
                                      m.email,
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.outfit(
                                        color: Colors.blue[200],
                                        fontSize: 10,
                                      ),
                                    ),
                                  ),
                                ),
                                // Land
                                DataCell(
                                  Text(
                                    '${m.registrationData['landSize'] ?? '-'} ac',
                                    style: GoogleFonts.outfit(
                                      color: Colors.white70,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                                // Plants
                                DataCell(
                                  Text(
                                    m.registrationData['quantityPlants'] ?? '-',
                                    style: GoogleFonts.outfit(
                                      color: Colors.white70,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                                // Joined
                                DataCell(
                                  Text(
                                    m.joinedDate != null
                                        ? DateFormat(
                                            'yyyy-MM-dd',
                                          ).format(m.joinedDate!)
                                        : '-',
                                    style: GoogleFonts.outfit(
                                      color: Colors.white,
                                      fontSize: 11,
                                    ),
                                  ),
                                ),
                                // Bought
                                DataCell(
                                  Container(
                                    padding: const EdgeInsets.all(4),
                                    color: const Color(0xFF1F2937),
                                    child: Text(
                                      m.totalBought.toStringAsFixed(2),
                                      style: GoogleFonts.outfit(
                                        color: Colors.greenAccent,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ),
                                // Sold
                                DataCell(
                                  Container(
                                    padding: const EdgeInsets.all(4),
                                    color: const Color(0xFF1F2937),
                                    child: Text(
                                      m.totalSold.toStringAsFixed(2),
                                      style: GoogleFonts.outfit(
                                        color: Colors.orangeAccent,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 11,
                                      ),
                                    ),
                                  ),
                                ),
                                // Actions
                                DataCell(
                                  Container(
                                    constraints: const BoxConstraints(
                                      maxWidth: 150,
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      mainAxisAlignment: MainAxisAlignment.end,
                                      children: [
                                        _buildActionIcon(
                                          Icons.visibility,
                                          Colors.white,
                                          () => _showMemberDetails(m),
                                          'View',
                                        ),
                                        if (AuthService.role != 'analyzer')
                                          _buildActionIcon(
                                            Icons.edit,
                                            Colors.blue,
                                            () => _startEditing(m),
                                            'Edit',
                                          ),
                                        _buildActionIcon(
                                          Icons.print,
                                          Colors.grey,
                                          () => _printMemberReport(m),
                                          'Print',
                                        ),
                                        if (AuthService.role != 'analyzer')
                                          _buildActionIcon(
                                            Icons.delete,
                                            Colors.red,
                                            () => _deleteMemberWithConfirmation(
                                              m,
                                            ),
                                            'Delete',
                                          ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                      );
                    }),
                    ..._newRows.asMap().entries.map((entry) {
                      final index = entry.key;
                      final row = entry.value;
                      return DataRow(
                        color: WidgetStateProperty.all(const Color(0xFF1F2937)),
                        cells: [
                          DataCell(
                            Text(
                              'AUTO',
                              style: GoogleFonts.outfit(
                                color: Colors.grey,
                                fontSize: 10,
                              ),
                            ),
                          ),
                          DataCell(_buildInlineField(row.nic, 'NIC')),
                          DataCell(_buildInlineField(row.name, 'Name')),
                          DataCell(
                            _buildInlineField(row.fieldVisitorId, 'FV Code'),
                          ),
                          DataCell(
                            _buildInlineField(
                              row.contact,
                              'Phone',
                              isPhone: true,
                            ),
                          ),
                          DataCell(_buildInlineField(row.address, 'Address')),
                          DataCell(_buildInlineField(row.email, 'Email')),
                          const DataCell(SizedBox()), // Land
                          const DataCell(SizedBox()), // Plants
                          DataCell(
                            Text(
                              DateFormat('yyyy-MM-dd').format(DateTime.now()),
                              style: GoogleFonts.outfit(color: Colors.white),
                            ),
                          ),
                          DataCell(
                            Text(
                              '0.00',
                              style: GoogleFonts.outfit(color: Colors.white),
                            ),
                          ),
                          DataCell(
                            Text(
                              '0.00',
                              style: GoogleFonts.outfit(color: Colors.white),
                            ),
                          ),
                          DataCell(
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(
                                    Icons.check,
                                    color: Colors.green,
                                  ),
                                  onPressed: () => _saveInlineRow(row, index),
                                  tooltip: 'Save',
                                ),
                                IconButton(
                                  icon: const Icon(
                                    Icons.close,
                                    color: Colors.red,
                                  ),
                                  onPressed: () {
                                    setState(() {
                                      row.dispose();
                                      _newRows.removeAt(index);
                                    });
                                  },
                                  tooltip: 'Cancel',
                                ),
                              ],
                            ),
                          ),
                        ],
                      );
                    }),
                  ],
                ),
              ),
            ),
          ),
          // Add Button Bar
          if (AuthService.role != 'analyzer')
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              color: const Color(0xFF111827),
              child: ElevatedButton.icon(
                onPressed: () {
                  setState(() {
                    _newRows.add(_InlineMemberRow());
                  });
                  // Scroll to end logic if possible, or user just sees it
                },
                icon: const Icon(Icons.add_circle, color: Colors.white),
                label: Text(
                  'ADD NEW MEMBER (INLINE)',
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1F2937),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  side: const BorderSide(color: Colors.white, width: 0.5),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _deleteMemberWithConfirmation(Member member) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm Delete'),
        content: Text('Are you sure you want to delete ${member.name}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      if (!mounted) return;

      try {
        await MemberService.deleteMember(member.id);

        AuditService.logAction(
          'Member Deleted',
          'Deleted Member: ${member.name} (${member.id})',
          targetUser: member.name,
        );

        if (!mounted) return;
        setState(() {});

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Member deleted successfully'),
            backgroundColor: Colors.green,
          ),
        );
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error deleting member: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
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

class _InlineMemberRow {
  final TextEditingController name = TextEditingController();
  final TextEditingController contact = TextEditingController();
  final TextEditingController email = TextEditingController();
  final TextEditingController nic = TextEditingController();
  final TextEditingController address = TextEditingController();
  final TextEditingController memberCode = TextEditingController();
  final TextEditingController area = TextEditingController();

  final TextEditingController fieldVisitorId = TextEditingController();

  DateTime dob = DateTime(1990);
  DateTime joinedDate = DateTime.now();

  void dispose() {
    name.dispose();
    contact.dispose();
    email.dispose();
    nic.dispose();
    address.dispose();
    memberCode.dispose();
    area.dispose();
    fieldVisitorId.dispose();
  }
}
