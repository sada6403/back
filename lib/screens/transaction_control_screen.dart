import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../models/transaction.dart';
import '../services/transaction_service.dart';
import '../services/auth_service.dart';

class TransactionControlScreen extends StatefulWidget {
  const TransactionControlScreen({super.key});

  @override
  State<TransactionControlScreen> createState() =>
      _TransactionControlScreenState();
}

class _TransactionControlScreenState extends State<TransactionControlScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<Transaction> _transactions = [];
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _performSearch() async {
    final query = _searchController.text.trim();
    if (query.isEmpty) {
      setState(() {
        _transactions = [];
        _errorMessage = null;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await TransactionService.getTransactions(
        billNumber: query,
      );
      setState(() {
        _transactions = results;
        if (results.isEmpty) {
          _errorMessage = 'No transactions found for "$query"';
        }
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Search failed: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _updateStatus(Transaction tx, String newStatus) async {
    if (AuthService.role == 'analyzer') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Access Denied: View-only role'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    final success = await TransactionService.updateStatus(tx.id, newStatus);
    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Transaction ${tx.billNumber} marked as $newStatus'),
        ),
      );
      _performSearch(); // Refresh
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to update status'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Transaction Control',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
      ),
      body: Column(
        children: [
          // Search Header
          Container(
            padding: const EdgeInsets.all(24.0),
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(32),
                bottomRight: Radius.circular(32),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Search Bill Number',
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    color: Colors.blue[300],
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _searchController,
                  style: const TextStyle(color: Colors.white, fontSize: 18),
                  onSubmitted: (_) => _performSearch(),
                  decoration: InputDecoration(
                    hintText: 'e.g. NF-B-2023...',
                    hintStyle: TextStyle(color: Colors.grey[600]),
                    prefixIcon: const Icon(Icons.search, color: Colors.blue),
                    suffixIcon: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (_searchController.text.isNotEmpty)
                          IconButton(
                            icon: const Icon(Icons.clear, color: Colors.grey),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {});
                            },
                          ),
                        Padding(
                          padding: const EdgeInsets.only(right: 8.0),
                          child: ElevatedButton(
                            onPressed: _performSearch,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue[700],
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 8,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text('SEARCH'),
                          ),
                        ),
                      ],
                    ),
                    filled: true,
                    fillColor: const Color(0xFF1E293B),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      vertical: 20,
                      horizontal: 16,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Results Area
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _errorMessage != null
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.search_off, size: 80, color: Colors.grey[700]),
                      const SizedBox(height: 16),
                      Text(
                        _errorMessage!,
                        style: GoogleFonts.outfit(
                          color: Colors.grey[500],
                          fontSize: 16,
                        ),
                      ),
                    ],
                  )
                : _transactions.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.receipt_long,
                          size: 80,
                          color: Colors.grey[800],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Enter a bill number to start',
                          style: GoogleFonts.outfit(color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _transactions.length,
                    itemBuilder: (context, index) {
                      final tx = _transactions[index];
                      return _buildTransactionCard(tx);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTransactionCard(Transaction tx) {
    final isBuy = tx.type.toLowerCase() == 'buy';
    final statusColor = tx.status == 'approved'
        ? Colors.green
        : tx.status == 'pending'
        ? Colors.orange
        : Colors.red;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      color: const Color(0xFF1E293B),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: (isBuy ? Colors.blue : Colors.orange).withValues(
                      alpha: 0.1,
                    ),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: (isBuy ? Colors.blue : Colors.orange).withValues(
                        alpha: 0.3,
                      ),
                    ),
                  ),
                  child: Text(
                    tx.type.toUpperCase(),
                    style: GoogleFonts.outfit(
                      color: isBuy ? Colors.blue[300] : Colors.orange[300],
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                Text(
                  DateFormat('dd MMM yyyy, hh:mm a').format(tx.date),
                  style: GoogleFonts.outfit(
                    color: Colors.grey[500],
                    fontSize: 13,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Bill Number',
                        style: GoogleFonts.outfit(
                          color: Colors.grey[400],
                          fontSize: 12,
                        ),
                      ),
                      Text(
                        tx.billNumber,
                        style: GoogleFonts.outfit(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: statusColor.withValues(alpha: 0.5),
                    ),
                  ),
                  child: Text(
                    tx.status.toUpperCase(),
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const Divider(height: 32, color: Colors.white10),
            _buildDetailRow('Member Name', tx.memberName),
            _buildDetailRow('Field Visitor ID', tx.fvId),
            _buildDetailRow('Product', tx.product),
            _buildDetailRow(
              'Unit Price',
              'Rs. ${tx.unitPrice.toStringAsFixed(2)} per ${tx.unit}',
            ),
            _buildDetailRow('Quantity', '${tx.quantity} ${tx.unit}'),
            _buildDetailRow(
              'Total Amount',
              'Rs. ${tx.amount.toStringAsFixed(2)}',
              isBold: true,
            ),

            if (tx.status == 'pending') ...[
              const SizedBox(height: 20),
              if (AuthService.role != 'analyzer')
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _updateStatus(tx, 'rejected'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('REJECT'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => _updateStatus(tx, 'approved'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        child: const Text('APPROVE'),
                      ),
                    ),
                  ],
                ),
            ],

            const Divider(height: 32, color: Colors.white10),
            if (AuthService.role != 'analyzer')
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  TextButton.icon(
                    onPressed: () => _editTransaction(tx),
                    icon: const Icon(Icons.edit, size: 18, color: Colors.blue),
                    label: Text(
                      'EDIT',
                      style: GoogleFonts.outfit(color: Colors.blue[300]),
                    ),
                  ),
                  const SizedBox(width: 16),
                  TextButton.icon(
                    onPressed: () => _confirmDelete(tx),
                    icon: const Icon(Icons.delete, size: 18, color: Colors.red),
                    label: Text(
                      'DELETE',
                      style: GoogleFonts.outfit(color: Colors.red[300]),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _editTransaction(Transaction tx) async {
    final nameCtrl = TextEditingController(text: tx.product);
    final qtyCtrl = TextEditingController(text: tx.quantity.toString());
    final priceCtrl = TextEditingController(text: tx.unitPrice.toString());
    final totalCtrl = TextEditingController(text: tx.amount.toString());

    void updateTotal() {
      final q = double.tryParse(qtyCtrl.text) ?? 0;
      final p = double.tryParse(priceCtrl.text) ?? 0;
      totalCtrl.text = (q * p).toStringAsFixed(2);
    }

    qtyCtrl.addListener(updateTotal);
    priceCtrl.addListener(updateTotal);

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: Text(
          'Edit Transaction',
          style: GoogleFonts.outfit(color: Colors.white),
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildEditField(nameCtrl, 'Product Name'),
              const SizedBox(height: 12),
              _buildEditField(qtyCtrl, 'Quantity', isNumber: true),
              const SizedBox(height: 12),
              _buildEditField(priceCtrl, 'Unit Price', isNumber: true),
              const SizedBox(height: 12),
              _buildEditField(totalCtrl, 'Total Amount', isNumber: true),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('SAVE'),
          ),
        ],
      ),
    );

    if (result == true) {
      final error = await TransactionService.updateTransaction(tx.id, {
        'productName': nameCtrl.text,
        'quantity': double.tryParse(qtyCtrl.text),
        'unitPrice': double.tryParse(priceCtrl.text),
        'totalAmount': double.tryParse(totalCtrl.text),
      });

      if (mounted) {
        if (error == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Transaction updated successfully')),
          );
          _performSearch();
        } else {
          showDialog(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Update Failed'),
              content: Text(error),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('OK'),
                ),
              ],
            ),
          );
        }
      }
    }
  }

  Future<void> _confirmDelete(Transaction tx) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text(
          'Confirm Delete',
          style: TextStyle(color: Colors.white),
        ),
        content: Text(
          'Are you sure you want to delete transaction ${tx.billNumber}?\nThis action cannot be undone.',
          style: const TextStyle(color: Colors.grey),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('CANCEL'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('DELETE'),
          ),
        ],
      ),
    );

    if (result == true) {
      final success = await TransactionService.deleteTransaction(tx.id);
      if (mounted) {
        if (success) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Transaction deleted')));
          _performSearch();
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to delete transaction'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    }
  }

  Widget _buildEditField(
    TextEditingController ctrl,
    String label, {
    bool isNumber = false,
  }) {
    return TextField(
      controller: ctrl,
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.grey),
        enabledBorder: const UnderlineInputBorder(
          borderSide: BorderSide(color: Colors.white24),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.outfit(color: Colors.grey[500], fontSize: 14),
          ),
          Text(
            value,
            style: GoogleFonts.outfit(
              color: Colors.grey[200],
              fontSize: 14,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}
