import 'package:flutter/material.dart';
import '../../services/report_service.dart';
import '../../services/transaction_service.dart';
import '../../services/employee_service.dart';

import '../../models/transaction.dart';
import 'advanced_reports_screen.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  DateTime _startDate = DateTime.now().subtract(const Duration(days: 30));
  DateTime _endDate = DateTime.now();

  bool _isLoading = false;
  final String _selectedRole = 'All';
  String _selectedBranch = 'All';

  // Combine 'All' with actual branches
  List<String> get _branches => ['All', ...EmployeeService.branches];

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _generateReport() async {
    setState(() => _isLoading = true);

    try {
      final startDate = _startDate;
      final endDate = DateTime(
        _endDate.year,
        _endDate.month,
        _endDate.day,
        23,
        59,
        59,
      );

      // Fetch transactions
      // Always fetch all since detailed filtering is removed/hidden
      List<Transaction> fetchedTransactions =
          await TransactionService.getTransactions();

      final List<Transaction> filteredTransactions = [];

      for (var t in fetchedTransactions) {
        // Date Logic
        if (t.date.isBefore(startDate) ||
            t.date.isAfter(endDate.add(const Duration(days: 1)))) {
          continue;
        }
        filteredTransactions.add(t);
      }

      filteredTransactions.sort((a, b) => b.date.compareTo(a.date));

      await ReportService.generateTransactionReport(
        title: _generateReportTitle(),
        startDate: startDate,
        endDate: endDate,
        transactions: filteredTransactions,
        userRole: _selectedRole,
        branch: _selectedBranch == 'All' ? null : _selectedBranch,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Report generated successfully')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _generateReportTitle() {
    String title = 'Report';
    if (_selectedRole != 'All') {
      title = '$_selectedRole Report';
    } else {
      title = 'General Report';
    }

    if (_selectedBranch != 'All') {
      title += ' ($_selectedBranch)';
    }

    // Format dates locally or use intl if available. Simple string format:
    final startStr = '${_startDate.year}-${_startDate.month}-${_startDate.day}';
    final endStr = '${_endDate.year}-${_endDate.month}-${_endDate.day}';
    title += ' ($startStr to $endStr)';
    return title;
  }

  Future<void> _selectDate(BuildContext context, bool isStart) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: isStart ? _startDate : _endDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2030),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
        } else {
          _endDate = picked;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Generate Reports')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Quick Actions',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const AdvancedReportsScreen(),
                  ),
                );
              },
              icon: const Icon(Icons.analytics),
              label: const Text('View Advanced Analytics'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blueAccent.withValues(alpha: 0.1),
                foregroundColor: Colors.blueAccent,
                padding: const EdgeInsets.symmetric(vertical: 16),
                side: const BorderSide(color: Colors.blueAccent, width: 1),
              ),
            ),
            const SizedBox(height: 32),
            const Text(
              'Select Report Criteria',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 20),

            // Date Range Selection
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => _selectDate(context, true),
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'From Date',
                        border: OutlineInputBorder(),
                        suffixIcon: Icon(Icons.calendar_today),
                      ),
                      child: Text(
                        '${_startDate.year}-${_startDate.month}-${_startDate.day}',
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: InkWell(
                    onTap: () => _selectDate(context, false),
                    child: InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'To Date',
                        border: OutlineInputBorder(),
                        suffixIcon: Icon(Icons.calendar_today),
                      ),
                      child: Text(
                        '${_endDate.year}-${_endDate.month}-${_endDate.day}',
                      ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Branch Dropdown
            InputDecorator(
              decoration: const InputDecoration(
                labelText: 'Area Scope',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: _selectedBranch,
                  isExpanded: true,
                  items: _branches
                      .map((b) => DropdownMenuItem(value: b, child: Text(b)))
                      .toList(),
                  onChanged: (val) => setState(() {
                    _selectedBranch = val!;
                  }),
                ),
              ),
            ),
            const SizedBox(height: 16),

            const SizedBox(height: 30),
            ElevatedButton.icon(
              onPressed: _isLoading ? null : _generateReport,
              icon: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.picture_as_pdf),
              label: Text(_isLoading ? 'Generating...' : 'Generate PDF Report'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
