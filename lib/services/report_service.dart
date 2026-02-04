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

class ReportService {
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
        0: const pw.FixedColumnWidth(70), // Date
        1: const pw.FixedColumnWidth(35), // Type
        2: const pw.FlexColumnWidth(2.5), // Description
        3: const pw.FlexColumnWidth(1.5), // Product
        4: const pw.FixedColumnWidth(40), // Qty
        5: const pw.FixedColumnWidth(35), // Unit
        6: const pw.FixedColumnWidth(45), // Unit Price
        7: const pw.FixedColumnWidth(55), // Amount
      },
      children: [
        // Header Row
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.green),
          children: [
            _buildTableCell('Date', isHeader: true),
            _buildTableCell('Type', isHeader: true),
            _buildTableCell('Description', isHeader: true),
            _buildTableCell('Product', isHeader: true),
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
              _buildTableCell(t.description),
              _buildTableCell(t.product),
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
}
