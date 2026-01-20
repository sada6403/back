import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import '../models/transaction.dart';

class ReportService {
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
    final headers = ['Date', 'Type', 'Description', 'Product', 'Amount'];
    final dateFormat = DateFormat('yyyy-MM-dd HH:mm');

    final data = transactions.map((t) {
      return [
        dateFormat.format(t.date),
        t.type,
        t.description,
        t.product,
        t.amount.toStringAsFixed(2),
      ];
    }).toList();

    return pw.TableHelper.fromTextArray(
      headers: headers,
      data: data,
      border: null,
      headerStyle: pw.TextStyle(
        fontWeight: pw.FontWeight.bold,
        color: PdfColors.white,
      ),
      headerDecoration: const pw.BoxDecoration(color: PdfColors.green),
      cellHeight: 30,
      cellAlignments: {
        0: pw.Alignment.centerLeft,
        1: pw.Alignment.centerLeft,
        2: pw.Alignment.centerLeft,
        3: pw.Alignment.centerLeft,
        4: pw.Alignment.centerRight,
      },
    );
  }
}
