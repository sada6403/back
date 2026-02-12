import 'dart:convert';
import 'package:flutter/material.dart' show Color;
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import 'dart:ui' as ui;
import '../models/transaction.dart';
import '../config/api_config.dart';
import 'session_service.dart';

class ReportService {
  static Future<List<dynamic>> getBranchStock({String? branchId}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';
      String url = '${ApiConfig.baseUrl}/reports/branch-stock';
      if (branchId != null && branchId != 'All') url += '?branchId=$branchId';

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        return body['data'] as List<dynamic>;
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching branch stock: $e');
      return [];
    }
  }

  static Future<Map<String, dynamic>> getBranchFinancials({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';
      String url = '${ApiConfig.baseUrl}/reports/branch-financials';

      List<String> params = [];
      if (startDate != null) {
        params.add('startDate=${startDate.toIso8601String()}');
      }
      if (endDate != null) params.add('endDate=${endDate.toIso8601String()}');

      if (params.isNotEmpty) url += '?${params.join('&')}';

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        return body['data'] as Map<String, dynamic>;
      }
      return {};
    } catch (e) {
      debugPrint('Error fetching branch financials: $e');
      return {};
    }
  }

  static Future<List<dynamic>> getFVPerformance({
    required String branchId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';
      String url =
          '${ApiConfig.baseUrl}/reports/fv-performance?branchId=$branchId';

      if (startDate != null) url += '&startDate=${startDate.toIso8601String()}';
      if (endDate != null) url += '&endDate=${endDate.toIso8601String()}';

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        return body['data'] as List<dynamic>;
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching FV performance: $e');
      return [];
    }
  }

  static Future<Map<String, dynamic>> getVisualAnalyticsData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/reports/visual-analytics'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          SessionService.logActivity(
            'REPORT_VIEW',
            details: 'Visual Analytics',
          );
          return body['data'] as Map<String, dynamic>;
        }
      }
      throw Exception('Failed to fetch visual analytics: ${response.body}');
    } catch (e) {
      debugPrint('Error fetching visual analytics: $e');
      rethrow;
    }
  }

  static Future<void> generateVisualAnalyticsPdf({
    required ui.Image branchImage,
    required ui.Image productImage,
    required ui.Image memberImage,
    required Map<String, dynamic> analyticsData,
  }) async {
    final pdf = pw.Document();
    final now = DateTime.now();
    final dateFormat = DateFormat('yyyy-MM-dd');

    // Convert images to bytes
    final branchBytes = await branchImage.toByteData(
      format: ui.ImageByteFormat.png,
    );
    final productBytes = await productImage.toByteData(
      format: ui.ImageByteFormat.png,
    );
    final memberBytes = await memberImage.toByteData(
      format: ui.ImageByteFormat.png,
    );

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return [
            pw.Text(
              'Nature Farming Protocol',
              style: pw.TextStyle(
                fontSize: 24,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.green,
              ),
            ),
            pw.SizedBox(height: 10),
            pw.Text(
              'Visual Comparison Report',
              style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
            ),
            pw.Text('Date: ${dateFormat.format(now)}'),
            pw.Divider(),
            pw.SizedBox(height: 20),

            // Branch Transaction Chart
            pw.Text(
              'Branch Transaction Analysis',
              style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
            ),
            pw.SizedBox(height: 10),
            pw.Image(
              pw.MemoryImage(branchBytes!.buffer.asUint8List()),
              width: 500,
            ),
            pw.SizedBox(height: 10),
            _buildBranchTransactionTable(analyticsData['branchTransactions']),
            pw.SizedBox(height: 30),

            // Product Analysis Chart
            pw.Text(
              'Product Buy/Sell Analysis',
              style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
            ),
            pw.SizedBox(height: 10),
            pw.Image(
              pw.MemoryImage(productBytes!.buffer.asUint8List()),
              width: 500,
            ),
            pw.SizedBox(height: 10),
            _buildProductAnalysisTable(analyticsData['productAnalysis']),
            pw.SizedBox(height: 30),

            // Member Distribution Chart
            pw.Text(
              'Member Distribution by Branch',
              style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold),
            ),
            pw.SizedBox(height: 10),
            pw.Image(
              pw.MemoryImage(memberBytes!.buffer.asUint8List()),
              width: 500,
            ),
            pw.SizedBox(height: 10),
            _buildMemberDistributionTable(analyticsData['memberDistribution']),
          ];
        },
      ),
    );

    await Printing.sharePdf(
      bytes: await pdf.save(),
      filename: 'visual_analytics_${DateFormat('yyyyMMdd').format(now)}.pdf',
    );

    // Log Report Download
    SessionService.logActivity(
      'REPORT_DOWNLOAD',
      details: 'Visual Analytics PDF',
    );
  }

  static Future<Map<String, dynamic>> getDailyBranchComparisonData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token') ?? '';

      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/reports/daily-branch-comparison'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        if (body['success'] == true) {
          SessionService.logActivity(
            'REPORT_VIEW',
            details: 'Daily Branch Comparison',
          );
          return body['data'] as Map<String, dynamic>;
        }
      }
      throw Exception('Failed to fetch comparison data: ${response.body}');
    } catch (e) {
      debugPrint('Error fetching daily comparison: $e');
      rethrow;
    }
  }

  static Future<void> generateComparisonPdf({
    required Map<String, dynamic> data,
    required List<Color> colors,
  }) async {
    final pdf = pw.Document();
    final now = DateTime.now();
    final dateFormat = DateFormat('yyyy-MM-dd');

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              pw.Text(
                'Nature Farming Protocol',
                style: pw.TextStyle(
                  fontSize: 24,
                  fontWeight: pw.FontWeight.bold,
                  color: PdfColors.green,
                ),
              ),
              pw.SizedBox(height: 10),
              pw.Text(
                'Daily Branch Comparison Report',
                style: pw.TextStyle(
                  fontSize: 18,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.Text('Date: ${dateFormat.format(now)}'),
              pw.Divider(),
              pw.SizedBox(height: 20),
              pw.Text(
                'Branch-wise Totals (Today)',
                style: pw.TextStyle(
                  fontSize: 16,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
              pw.SizedBox(height: 10),
              _buildComparisonTable(data, colors),
            ],
          );
        },
      ),
    );

    await Printing.sharePdf(
      bytes: await pdf.save(),
      filename: 'comparison_${DateFormat('yyyyMMdd').format(now)}.pdf',
    );

    // Log Report Download
    SessionService.logActivity(
      'REPORT_DOWNLOAD',
      details: 'Daily Branch Comparison PDF',
    );
  }

  static pw.Widget _buildComparisonTable(
    Map<String, dynamic> data,
    List<Color> colors,
  ) {
    int index = 0;

    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey300),
      columnWidths: {
        0: const pw.FixedColumnWidth(30),
        1: const pw.FlexColumnWidth(3),
        2: const pw.FlexColumnWidth(2),
        3: const pw.FlexColumnWidth(2),
        4: const pw.FlexColumnWidth(2),
      },
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.blueGrey),
          children: [
            pw.Padding(
              padding: const pw.EdgeInsets.all(5),
              child: pw.Text(
                'Clr',
                style: pw.TextStyle(
                  color: PdfColors.white,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ),
            pw.Padding(
              padding: const pw.EdgeInsets.all(5),
              child: pw.Text(
                'Branch Name',
                style: pw.TextStyle(
                  color: PdfColors.white,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ),
            pw.Padding(
              padding: const pw.EdgeInsets.all(5),
              child: pw.Text(
                'Daily Buy',
                style: pw.TextStyle(
                  color: PdfColors.white,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ),
            pw.Padding(
              padding: const pw.EdgeInsets.all(5),
              child: pw.Text(
                'Daily Sell',
                style: pw.TextStyle(
                  color: PdfColors.white,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ),
            pw.Padding(
              padding: const pw.EdgeInsets.all(5),
              child: pw.Text(
                'Net',
                style: pw.TextStyle(
                  color: PdfColors.white,
                  fontWeight: pw.FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        ...data.entries.map((entry) {
          final branchId = entry.key;
          final totals = entry.value;
          final buy = (totals['buy'] as num).toDouble();
          final sell = (totals['sell'] as num).toDouble();

          final clr = colors[index % colors.length];
          index++;

          // Convert Flutter color to PdfColor
          final pdfClr = PdfColor.fromInt(clr.toARGB32());

          return pw.TableRow(
            children: [
              pw.Padding(
                padding: const pw.EdgeInsets.all(8),
                child: pw.Container(
                  width: 10,
                  height: 10,
                  decoration: pw.BoxDecoration(
                    color: pdfClr,
                    shape: pw.BoxShape.circle,
                  ),
                ),
              ),
              pw.Padding(
                padding: const pw.EdgeInsets.all(5),
                child: pw.Text(branchId),
              ),
              pw.Padding(
                padding: const pw.EdgeInsets.all(5),
                child: pw.Text(
                  'Rs. ${buy.toStringAsFixed(2)}',
                  textAlign: pw.TextAlign.right,
                ),
              ),
              pw.Padding(
                padding: const pw.EdgeInsets.all(5),
                child: pw.Text(
                  'Rs. ${sell.toStringAsFixed(2)}',
                  textAlign: pw.TextAlign.right,
                ),
              ),
              pw.Padding(
                padding: const pw.EdgeInsets.all(5),
                child: pw.Text(
                  'Rs. ${(sell - buy).toStringAsFixed(2)}',
                  textAlign: pw.TextAlign.right,
                ),
              ),
            ],
          );
        }),
      ],
    );
  }

  static Future<void> generateTransactionReport({
    required String title,
    required DateTime startDate,
    required DateTime endDate,
    required List<Transaction> transactions,
    String? userName,
    String? userRole,
    String? branch,
    String? specificEntityName,
    bool isSummary = false,
  }) async {
    final pdf = pw.Document();

    // Load a font if needed, or use default
    // final font = await PdfGoogleFonts.nunitoExtraLight();

    // Calculate totals
    double totalBuy = 0;
    double totalSell = 0;

    for (var t in transactions) {
      // Assuming Transaction object has type and amount
      // We'll use dynamic access or need to import Transaction class
      if (t.type.toLowerCase() == 'buy') {
        totalBuy += t.amount;
      } else if (t.type.toLowerCase() == 'sell') {
        totalSell += t.amount;
      }
    }

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return [
            _buildHeader(
              title,
              startDate,
              endDate,
              userName,
              userRole,
              branch,
              specificEntityName,
            ),
            pw.SizedBox(height: 20),
            _buildSummary(totalBuy, totalSell),
            pw.SizedBox(height: 20),
            if (!isSummary) _buildTransactionTable(transactions),
            if (isSummary)
              pw.Text("Detailed transactions omitted for summary report."),
          ];
        },
      ),
    );

    await Printing.sharePdf(
      bytes: await pdf.save(),
      filename: 'report_${DateFormat('yyyyMMdd').format(DateTime.now())}.pdf',
    );

    // Log Report Download
    SessionService.logActivity(
      'REPORT_DOWNLOAD',
      details: 'Transaction Report: $title',
    );
  }

  static pw.Widget _buildHeader(
    String title,
    DateTime start,
    DateTime end,
    String? name,
    String? role,
    String? branch,
    String? specificEntityName,
  ) {
    final dateFormat = DateFormat('yyyy-MM-dd');
    return pw.Column(
      crossAxisAlignment: pw.CrossAxisAlignment.start,
      children: [
        pw.Text(
          'Nature Farming Protocol',
          style: pw.TextStyle(
            fontSize: 24,
            fontWeight: pw.FontWeight.bold,
            color: PdfColors.green,
          ),
        ),
        pw.SizedBox(height: 10),
        pw.Text(
          title,
          style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
        ),
        pw.SizedBox(height: 5),
        pw.Text(
          'Period: ${dateFormat.format(start)} - ${dateFormat.format(end)}',
        ),
        if (name != null) pw.Text('Name: $name'),
        if (role != null) pw.Text('Role: $role'),
        if (branch != null) pw.Text('Branch: $branch'),
        if (specificEntityName != null) pw.Text('Entity: $specificEntityName'),
        pw.Divider(),
      ],
    );
  }

  static pw.Widget _buildSummary(double buy, double sell) {
    return pw.Container(
      padding: const pw.EdgeInsets.all(10),
      decoration: pw.BoxDecoration(
        border: pw.Border.all(color: PdfColors.grey),
        borderRadius: pw.BorderRadius.circular(4),
      ),
      child: pw.Row(
        mainAxisAlignment: pw.MainAxisAlignment.spaceAround,
        children: [
          pw.Column(
            children: [
              pw.Text(
                'Total Buy',
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              ),
              pw.Text(
                'Rs. ${buy.toStringAsFixed(2)}',
                style: const pw.TextStyle(color: PdfColors.green),
              ),
            ],
          ),
          pw.Column(
            children: [
              pw.Text(
                'Total Sell',
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              ),
              pw.Text(
                'Rs. ${sell.toStringAsFixed(2)}',
                style: const pw.TextStyle(color: PdfColors.red),
              ),
            ],
          ),
          pw.Column(
            children: [
              pw.Text(
                'Net',
                style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
              ),
              pw.Text(
                'Rs. ${(sell - buy).toStringAsFixed(2)}',
                style: pw.TextStyle(
                  fontWeight: pw.FontWeight.bold,
                  color: (sell - buy) >= 0 ? PdfColors.green : PdfColors.red,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  static pw.Widget _buildTransactionTable(List<Transaction> transactions) {
    final dateFormat = DateFormat('yyyy-MM-dd HH:mm');

    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey300, width: 0.5),
      columnWidths: {
        0: const pw.FixedColumnWidth(68), // Date
        1: const pw.FixedColumnWidth(32), // Type
        2: const pw.FlexColumnWidth(1.3), // Product
        3: const pw.FlexColumnWidth(1.3), // Farmer
        4: const pw.FixedColumnWidth(52), // FV ID
        5: const pw.FixedColumnWidth(32), // Qty
        6: const pw.FixedColumnWidth(25), // Unit
        7: const pw.FixedColumnWidth(55), // Unit Price
        8: const pw.FixedColumnWidth(70), // Amount
      },
      children: [
        // Header Row
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.green),
          children: [
            _buildTableCell('Date', isHeader: true),
            _buildTableCell('Type', isHeader: true),
            _buildTableCell('Product', isHeader: true),
            _buildTableCell('Farmer', isHeader: true),
            _buildTableCell('FV ID', isHeader: true),
            _buildTableCell('Qty', isHeader: true, align: pw.TextAlign.right),
            _buildTableCell('Unit', isHeader: true),
            _buildTableCell(
              'Unit\nPrice',
              isHeader: true,
              align: pw.TextAlign.right,
            ),
            _buildTableCell(
              'Amount',
              isHeader: true,
              align: pw.TextAlign.right,
            ),
          ],
        ),
        // Data Rows
        ...transactions.map((t) {
          return pw.TableRow(
            children: [
              _buildTableCell(dateFormat.format(t.date)),
              _buildTableCell(t.type.toUpperCase()),
              _buildTableCell(t.product),
              _buildTableCell(t.memberName),
              _buildTableCell(t.fvId),
              _buildTableCell(
                t.quantity.toStringAsFixed(2),
                align: pw.TextAlign.right,
              ),
              _buildTableCell(t.unit),
              _buildTableCell(
                'Rs. ${t.unitPrice.toStringAsFixed(2)}',
                align: pw.TextAlign.right,
              ),
              _buildTableCell(
                'Rs. ${t.amount.toStringAsFixed(2)}',
                align: pw.TextAlign.right,
              ),
            ],
          );
        }),
      ],
    );
  }

  static pw.Widget _buildTableCell(
    String text, {
    bool isHeader = false,
    pw.TextAlign align = pw.TextAlign.left,
  }) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(4),
      child: pw.Text(
        text,
        style: pw.TextStyle(
          fontSize: isHeader ? 9 : 8,
          fontWeight: isHeader ? pw.FontWeight.bold : pw.FontWeight.normal,
          color: isHeader ? PdfColors.white : PdfColors.black,
        ),
        textAlign: align,
      ),
    );
  }

  static pw.Widget _buildBranchTransactionTable(dynamic data) {
    if (data == null || data is! Map) return pw.SizedBox();
    final Map<String, dynamic> branchData = data as Map<String, dynamic>;

    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey300),
      columnWidths: {
        0: const pw.FlexColumnWidth(2),
        1: const pw.FlexColumnWidth(1),
      },
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.blueGrey),
          children: [
            _buildTableCell('Branch Name', isHeader: true),
            _buildTableCell(
              'Total Amount (Rs)',
              isHeader: true,
              align: pw.TextAlign.right,
            ),
          ],
        ),
        ...branchData.entries.map((entry) {
          final amount =
              (entry.value['totalAmount'] as num?)?.toDouble() ?? 0.0;
          return pw.TableRow(
            children: [
              _buildTableCell(entry.key),
              _buildTableCell(
                amount.toStringAsFixed(2),
                align: pw.TextAlign.right,
              ),
            ],
          );
        }),
      ],
    );
  }

  static pw.Widget _buildProductAnalysisTable(dynamic data) {
    if (data == null || data is! Map) return pw.SizedBox();
    final Map<String, dynamic> productData = data as Map<String, dynamic>;

    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey300),
      columnWidths: {
        0: const pw.FlexColumnWidth(2),
        1: const pw.FlexColumnWidth(1),
        2: const pw.FlexColumnWidth(1),
      },
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.blueGrey),
          children: [
            _buildTableCell('Product Name', isHeader: true),
            _buildTableCell(
              'Buy Amount (Rs)',
              isHeader: true,
              align: pw.TextAlign.right,
            ),
            _buildTableCell(
              'Sell Amount (Rs)',
              isHeader: true,
              align: pw.TextAlign.right,
            ),
          ],
        ),
        ...productData.entries.map((entry) {
          final buy = (entry.value['buy'] as num?)?.toDouble() ?? 0.0;
          final sell = (entry.value['sell'] as num?)?.toDouble() ?? 0.0;
          return pw.TableRow(
            children: [
              _buildTableCell(entry.key),
              _buildTableCell(
                buy.toStringAsFixed(2),
                align: pw.TextAlign.right,
              ),
              _buildTableCell(
                sell.toStringAsFixed(2),
                align: pw.TextAlign.right,
              ),
            ],
          );
        }),
      ],
    );
  }

  static pw.Widget _buildMemberDistributionTable(dynamic data) {
    if (data == null || data is! Map) return pw.SizedBox();
    final Map<String, dynamic> memberData = data as Map<String, dynamic>;

    double total = 0;
    memberData.forEach((_, count) {
      total += (count as num).toDouble();
    });

    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey300),
      columnWidths: {
        0: const pw.FlexColumnWidth(2),
        1: const pw.FlexColumnWidth(1),
        2: const pw.FlexColumnWidth(1),
      },
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.blueGrey),
          children: [
            _buildTableCell('Branch Name', isHeader: true),
            _buildTableCell(
              'Member Count',
              isHeader: true,
              align: pw.TextAlign.right,
            ),
            _buildTableCell(
              'Percentage',
              isHeader: true,
              align: pw.TextAlign.right,
            ),
          ],
        ),
        ...memberData.entries.map((entry) {
          final count = (entry.value as num).toDouble();
          final percentage = total > 0 ? (count / total) * 100 : 0.0;
          return pw.TableRow(
            children: [
              _buildTableCell(entry.key),
              _buildTableCell(
                count.toInt().toString(),
                align: pw.TextAlign.right,
              ),
              _buildTableCell(
                '${percentage.toStringAsFixed(1)}%',
                align: pw.TextAlign.right,
              ),
            ],
          );
        }),
      ],
    );
  }

  static Future<void> generateStockReport({
    required List<dynamic> stockData,
    String? branch,
  }) async {
    final pdf = pw.Document();
    final now = DateTime.now();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          return [
            pw.Text(
              'Nature Farming Protocol',
              style: pw.TextStyle(
                fontSize: 24,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.green,
              ),
            ),
            pw.SizedBox(height: 10),
            pw.Text(
              'Branch Inventory (Stock) Report',
              style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
            ),
            pw.Text('Date: ${DateFormat('MMM dd, yyyy HH:mm').format(now)}'),
            if (branch != null) pw.Text('Branch Scope: $branch'),
            pw.Divider(),
            pw.SizedBox(height: 20),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300),
              columnWidths: {
                0: const pw.FlexColumnWidth(2),
                1: const pw.FlexColumnWidth(3),
                2: const pw.FlexColumnWidth(1),
              },
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.green),
                  children: [
                    _buildTableCell('Branch', isHeader: true),
                    _buildTableCell('Product Name', isHeader: true),
                    _buildTableCell(
                      'Stock Qty',
                      isHeader: true,
                      align: pw.TextAlign.right,
                    ),
                  ],
                ),
                ...stockData.map((s) {
                  return pw.TableRow(
                    children: [
                      _buildTableCell(s['branchName'] ?? s['branchId']),
                      _buildTableCell(s['productName']),
                      _buildTableCell(
                        (s['currentStock'] as num).toStringAsFixed(2),
                        align: pw.TextAlign.right,
                      ),
                    ],
                  );
                }),
              ],
            ),
          ];
        },
      ),
    );

    await Printing.sharePdf(
      bytes: await pdf.save(),
      filename: 'stock_report_${DateFormat('yyyyMMdd').format(now)}.pdf',
    );
  }

  static Future<void> generateFinancialReport({
    required Map<String, dynamic> financialData,
    required DateTime start,
    required DateTime end,
  }) async {
    final pdf = pw.Document();
    final now = DateTime.now();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          double totalBuy = 0;
          double totalSell = 0;

          final rows = financialData.entries.map((e) {
            final bName = e.key;
            final data = e.value;
            final buy = (data['buy'] as num).toDouble();
            final sell = (data['sell'] as num).toDouble();
            totalBuy += buy;
            totalSell += sell;

            return pw.TableRow(
              children: [
                _buildTableCell(bName),
                _buildTableCell(
                  'Rs. ${NumberFormat('#,###.00').format(buy)}',
                  align: pw.TextAlign.right,
                ),
                _buildTableCell(
                  'Rs. ${NumberFormat('#,###.00').format(sell)}',
                  align: pw.TextAlign.right,
                ),
                _buildTableCell(
                  'Rs. ${NumberFormat('#,###.00').format(sell - buy)}',
                  align: pw.TextAlign.right,
                ),
              ],
            );
          }).toList();

          return [
            pw.Text(
              'Nature Farming Protocol',
              style: pw.TextStyle(
                fontSize: 24,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.green,
              ),
            ),
            pw.SizedBox(height: 10),
            pw.Text(
              'Financial Comparison Report (Branch-wise)',
              style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
            ),
            pw.Text(
              'Period: ${DateFormat('yyyy-MM-dd').format(start)} to ${DateFormat('yyyy-MM-dd').format(end)}',
            ),
            pw.Divider(),
            pw.SizedBox(height: 20),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300),
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(
                    color: PdfColors.blueAccent,
                  ),
                  children: [
                    _buildTableCell('Branch Name', isHeader: true),
                    _buildTableCell(
                      'Total Buy',
                      isHeader: true,
                      align: pw.TextAlign.right,
                    ),
                    _buildTableCell(
                      'Total Sell',
                      isHeader: true,
                      align: pw.TextAlign.right,
                    ),
                    _buildTableCell(
                      'Net Profit/Loss',
                      isHeader: true,
                      align: pw.TextAlign.right,
                    ),
                  ],
                ),
                ...rows,
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                  children: [
                    pw.Padding(
                      padding: const pw.EdgeInsets.all(5),
                      child: pw.Text(
                        'GRAND TOTAL',
                        style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
                      ),
                    ),
                    _buildTableCell(
                      'Rs. ${NumberFormat('#,###.00').format(totalBuy)}',
                      align: pw.TextAlign.right,
                    ),
                    _buildTableCell(
                      'Rs. ${NumberFormat('#,###.00').format(totalSell)}',
                      align: pw.TextAlign.right,
                    ),
                    _buildTableCell(
                      'Rs. ${NumberFormat('#,###.00').format(totalSell - totalBuy)}',
                      align: pw.TextAlign.right,
                    ),
                  ],
                ),
              ],
            ),
          ];
        },
      ),
    );

    await Printing.sharePdf(
      bytes: await pdf.save(),
      filename: 'financial_report_${DateFormat('yyyyMMdd').format(now)}.pdf',
    );
  }

  static Future<void> generatePerformanceReport({
    required List<dynamic> performanceData,
    required String branch,
    required DateTime start,
    required DateTime end,
  }) async {
    final pdf = pw.Document();
    final now = DateTime.now();

    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        build: (pw.Context context) {
          // Simple Bar Chart Visual in PDF
          double maxSell = 0;
          for (var p in performanceData) {
            double s = (p['sellAmount'] as num).toDouble();
            if (s > maxSell) maxSell = s;
          }

          return [
            pw.Text(
              'Nature Farming Protocol',
              style: pw.TextStyle(
                fontSize: 24,
                fontWeight: pw.FontWeight.bold,
                color: PdfColors.green,
              ),
            ),
            pw.SizedBox(height: 10),
            pw.Text(
              'Field Visitor Performance Analysis',
              style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold),
            ),
            pw.Text('Branch: $branch'),
            pw.Text(
              'Period: ${DateFormat('yyyy-MM-dd').format(start)} to ${DateFormat('yyyy-MM-dd').format(end)}',
            ),
            pw.Divider(),
            pw.SizedBox(height: 20),
            pw.Text(
              'Performance Chart (Sales Volume)',
              style: pw.TextStyle(fontWeight: pw.FontWeight.bold),
            ),
            pw.SizedBox(height: 10),
            ...performanceData.map((p) {
              final sell = (p['sellAmount'] as num).toDouble();
              final width = maxSell > 0 ? (sell / maxSell) * 400 : 0.0;
              return pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text(
                    '${p['name']} (Rs. ${NumberFormat('#,###').format(sell)})',
                    style: const pw.TextStyle(fontSize: 10),
                  ),
                  pw.SizedBox(height: 2),
                  pw.Container(
                    width: width,
                    height: 10,
                    color: PdfColors.blueAccent,
                  ),
                  pw.SizedBox(height: 8),
                ],
              );
            }),
            pw.SizedBox(height: 20),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey300),
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.blueGrey),
                  children: [
                    _buildTableCell('Field Visitor', isHeader: true),
                    _buildTableCell(
                      'Sales Amount',
                      isHeader: true,
                      align: pw.TextAlign.right,
                    ),
                    _buildTableCell(
                      'Buy Amount',
                      isHeader: true,
                      align: pw.TextAlign.right,
                    ),
                    _buildTableCell(
                      'Tx Count',
                      isHeader: true,
                      align: pw.TextAlign.center,
                    ),
                  ],
                ),
                ...performanceData.map((p) {
                  return pw.TableRow(
                    children: [
                      _buildTableCell(p['name']),
                      _buildTableCell(
                        'Rs. ${NumberFormat('#,###').format(p['sellAmount'])}',
                        align: pw.TextAlign.right,
                      ),
                      _buildTableCell(
                        'Rs. ${NumberFormat('#,###').format(p['buyAmount'])}',
                        align: pw.TextAlign.right,
                      ),
                      _buildTableCell(
                        (p['sellCount'] + p['buyCount']).toString(),
                        align: pw.TextAlign.center,
                      ),
                    ],
                  );
                }),
              ],
            ),
          ];
        },
      ),
    );

    await Printing.sharePdf(
      bytes: await pdf.save(),
      filename: 'performance_report_${DateFormat('yyyyMMdd').format(now)}.pdf',
    );
  }
}
