import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/member_service.dart';
import '../services/audit_service.dart';

class BulkMemberRow {
  final TextEditingController name = TextEditingController();
  final TextEditingController contact = TextEditingController();
  final TextEditingController email = TextEditingController();
  final TextEditingController nic = TextEditingController();
  final TextEditingController address = TextEditingController();
  final TextEditingController memberCode = TextEditingController();
  final TextEditingController area = TextEditingController();

  DateTime dob = DateTime(1990);
  DateTime joinedDate = DateTime.now();
  String status = 'active';

  void dispose() {
    name.dispose();
    contact.dispose();
    email.dispose();
    nic.dispose();
    address.dispose();
    memberCode.dispose();
    area.dispose();
  }
}

class MemberBulkEntryDialog extends StatefulWidget {
  final VoidCallback onSaveComplete;

  const MemberBulkEntryDialog({super.key, required this.onSaveComplete});

  @override
  State<MemberBulkEntryDialog> createState() => _MemberBulkEntryDialogState();
}

class _MemberBulkEntryDialogState extends State<MemberBulkEntryDialog> {
  List<BulkMemberRow> rows = [];
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _addRow(); // Start with one row
  }

  @override
  void dispose() {
    for (var row in rows) {
      row.dispose();
    }
    super.dispose();
  }

  void _addRow() {
    setState(() {
      rows.add(BulkMemberRow());
    });
  }

  void _removeRow(int index) {
    if (rows.length > 1) {
      setState(() {
        rows[index].dispose();
        rows.removeAt(index);
      });
    }
  }

  Future<void> _saveAll() async {
    setState(() => _isSaving = true);
    int successCount = 0;
    List<String> errors = [];

    for (int i = 0; i < rows.length; i++) {
      var row = rows[i];

      // Basic Validation
      if (row.name.text.isEmpty || row.contact.text.isEmpty) {
        errors.add('Row ${i + 1}: Missing Name or Contact');
        continue;
      }

      try {
        // Prepare Member object
        // Note: memberCode is optional, if empty backend might generate or we can skip
        final id = row.memberCode.text.isNotEmpty
            ? row.memberCode.text
            : 'M${DateTime.now().millisecondsSinceEpoch + i}'; // Temp ID if needed

        final member = MemberService.create(
          id: id,
          name: row.name.text,
          contact: row.contact.text,
          email: row.email.text,
          dob: row.dob,
          joinedDate: row.joinedDate,
        );

        // Add extra fields
        final fullMember = member.copyWith(
          nic: row.nic.text,
          address: row.address.text,
          memberCode: row.memberCode.text,
          area: row.area.text,
          status: row.status,
        );

        await MemberService.addMember(fullMember);

        AuditService.logAction(
          'Member Created (Bulk)',
          'Created Member: ${row.name.text}',
          targetUser: row.name.text,
        );

        successCount++;
      } catch (e) {
        errors.add('Row ${i + 1}: Error - $e');
      }
    }

    setState(() => _isSaving = false);

    if (mounted) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(
            'Bulk Entry Summary',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
          ),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Successfully added: $successCount',
                  style: GoogleFonts.outfit(),
                ),
                if (errors.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    'Errors:',
                    style: GoogleFonts.outfit(
                      color: Colors.red,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  ...errors.map(
                    (e) => Text(
                      e,
                      style: GoogleFonts.outfit(
                        color: Colors.red,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(ctx); // Close summary
                if (successCount > 0) {
                  widget.onSaveComplete(); // Refresh parent
                  Navigator.pop(context); // Close bulk dialog
                }
              },
              child: Text('OK', style: GoogleFonts.outfit()),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.all(10),
      backgroundColor: const Color(0xFF111827), // Dark theme matching app
      child: Container(
        width: double.infinity,
        height: double.infinity,
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Bulk Member Entry',
                  style: GoogleFonts.outfit(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            Expanded(
              child: Theme(
                data: Theme.of(context).copyWith(
                  dataTableTheme: DataTableThemeData(
                    headingRowColor: WidgetStateProperty.all(
                      const Color(0xFF374151),
                    ),
                    dataRowColor: WidgetStateProperty.all(
                      const Color(0xFF1F2937),
                    ),
                    headingTextStyle: GoogleFonts.outfit(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                    dataTextStyle: GoogleFonts.outfit(color: Colors.white),
                  ),
                ),
                child: SingleChildScrollView(
                  scrollDirection: Axis.vertical,
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: DataTable(
                      columnSpacing: 20,
                      border: TableBorder.all(color: Colors.grey.shade700),
                      columns: const [
                        DataColumn(label: Text('Code')),
                        DataColumn(label: Text('Use Name *')),
                        DataColumn(label: Text('Contact *')),
                        DataColumn(label: Text('NIC')),
                        DataColumn(label: Text('Address')),
                        DataColumn(label: Text('Area')),
                        DataColumn(label: Text('Email')),
                        DataColumn(label: Text('DOB')),
                        DataColumn(label: Text('Joined')),
                        DataColumn(label: Text('Status')),
                        DataColumn(label: Text('Remove')),
                      ],
                      rows: List.generate(rows.length, (index) {
                        final row = rows[index];
                        return DataRow(
                          cells: [
                            _buildCell(row.memberCode, 'Code', width: 80),
                            _buildCell(row.name, 'Name', width: 150),
                            _buildCell(
                              row.contact,
                              'Phone',
                              width: 120,
                              isPhone: true,
                            ),
                            _buildCell(row.nic, 'NIC', width: 120),
                            _buildCell(row.address, 'Address', width: 150),
                            _buildCell(row.area, 'Area', width: 120),
                            _buildCell(row.email, 'Email', width: 150),
                            DataCell(
                              TextButton(
                                onPressed: () async {
                                  final d = await showDatePicker(
                                    context: context,
                                    initialDate: row.dob,
                                    firstDate: DateTime(1920),
                                    lastDate: DateTime.now(),
                                  );
                                  if (d != null) setState(() => row.dob = d);
                                },
                                child: Text(
                                  DateFormat('yyyy-MM-dd').format(row.dob),
                                  style: const TextStyle(
                                    color: Colors.blueAccent,
                                  ),
                                ),
                              ),
                            ),
                            DataCell(
                              TextButton(
                                onPressed: () async {
                                  final d = await showDatePicker(
                                    context: context,
                                    initialDate: row.joinedDate,
                                    firstDate: DateTime(2000),
                                    lastDate: DateTime.now(),
                                  );
                                  if (d != null) {
                                    setState(() => row.joinedDate = d);
                                  }
                                },
                                child: Text(
                                  DateFormat(
                                    'yyyy-MM-dd',
                                  ).format(row.joinedDate),
                                  style: const TextStyle(
                                    color: Colors.blueAccent,
                                  ),
                                ),
                              ),
                            ),
                            DataCell(
                              DropdownButton<String>(
                                value: row.status,
                                dropdownColor: const Color(0xFF374151),
                                style: GoogleFonts.outfit(color: Colors.white),
                                underline: Container(),
                                items: ['active', 'suspended']
                                    .map(
                                      (s) => DropdownMenuItem(
                                        value: s,
                                        child: Text(
                                          s.toUpperCase(),
                                          style: TextStyle(
                                            color: s == 'active'
                                                ? Colors.green
                                                : Colors.red,
                                          ),
                                        ),
                                      ),
                                    )
                                    .toList(),
                                onChanged: (v) =>
                                    setState(() => row.status = v!),
                              ),
                            ),
                            DataCell(
                              IconButton(
                                icon: const Icon(
                                  Icons.delete,
                                  color: Colors.red,
                                ),
                                onPressed: () => _removeRow(index),
                              ),
                            ),
                          ],
                        );
                      }),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                ElevatedButton.icon(
                  onPressed: _addRow,
                  icon: const Icon(Icons.add, color: Colors.black),
                  label: Text(
                    'Add Row',
                    style: GoogleFonts.outfit(
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                  ),
                ),
                const Spacer(),
                ElevatedButton(
                  onPressed: _isSaving ? null : _saveAll,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                  ),
                  child: _isSaving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : Text(
                          'SAVE ALL MEMBERS',
                          style: GoogleFonts.outfit(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  DataCell _buildCell(
    TextEditingController ctrl,
    String hint, {
    double width = 100,
    bool isPhone = false,
  }) {
    return DataCell(
      Container(
        width: width,
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: TextField(
          controller: ctrl,
          keyboardType: isPhone ? TextInputType.phone : TextInputType.text,
          style: GoogleFonts.outfit(color: Colors.white, fontSize: 13),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.outfit(color: Colors.grey),
            isDense: true,
            border: InputBorder.none,
            contentPadding: const EdgeInsets.all(8),
            filled: true,
            fillColor: Colors.white.withValues(alpha: 0.05),
          ),
        ),
      ),
    );
  }
}
