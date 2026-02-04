import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:fl_chart/fl_chart.dart';
import 'dart:ui' as ui;
import '../../services/report_service.dart';

class VisualComparisonScreen extends StatefulWidget {
  const VisualComparisonScreen({super.key});

  @override
  State<VisualComparisonScreen> createState() => _VisualComparisonScreenState();
}

class _VisualComparisonScreenState extends State<VisualComparisonScreen> {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic> _analyticsData = {};

  final GlobalKey _branchChartKey = GlobalKey();
  final GlobalKey _productChartKey = GlobalKey();
  final GlobalKey _memberChartKey = GlobalKey();

  final List<Color> _colors = [
    Colors.blue,
    Colors.red,
    Colors.green,
    Colors.orange,
    Colors.purple,
    Colors.teal,
    Colors.pink,
    Colors.brown,
    Colors.indigo,
    Colors.amber,
    Colors.cyan,
    Colors.deepOrange,
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final data = await ReportService.getVisualAnalyticsData();
      if (mounted) {
        setState(() {
          _analyticsData = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Visual Comparison Report'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
        actions: [
          if (!_isLoading && _error == null && _analyticsData.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.download),
              tooltip: 'Export to PDF',
              onPressed: _exportToPdf,
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.error_outline,
                      size: 64,
                      color: Colors.red,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Error: $_error',
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 16),
                    ),
                    const SizedBox(height: 32),
                    ElevatedButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back),
                      label: const Text('Go Back'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 32,
                          vertical: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSectionTitle('Branch Transaction Analysis'),
                    const SizedBox(height: 16),
                    _buildBranchTransactionChart(),
                    const SizedBox(height: 40),
                    _buildSectionTitle('Product Buy/Sell Analysis'),
                    const SizedBox(height: 16),
                    _buildProductAnalysisChart(),
                    const SizedBox(height: 40),
                    _buildSectionTitle('Member Distribution by Branch'),
                    const SizedBox(height: 16),
                    _buildMemberDistributionChart(),
                    const SizedBox(height: 48),
                    Center(
                      child: SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton.icon(
                          onPressed: _exportToPdf,
                          icon: const Icon(Icons.picture_as_pdf),
                          label: const Text(
                            'Download PDF Report',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.blueAccent,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
    );
  }

  Widget _buildBranchTransactionChart() {
    final branchData =
        _analyticsData['branchTransactions'] as Map<String, dynamic>? ?? {};

    if (branchData.isEmpty) {
      return const SizedBox(
        height: 200,
        child: Center(child: Text('No branch transaction data available')),
      );
    }

    final sections = <PieChartSectionData>[];
    int colorIndex = 0;
    double total = 0;

    branchData.forEach((branch, data) {
      final amount = (data['totalAmount'] as num?)?.toDouble() ?? 0.0;
      total += amount;
    });

    branchData.forEach((branch, data) {
      final amount = (data['totalAmount'] as num?)?.toDouble() ?? 0.0;
      if (amount > 0) {
        final percentage = (amount / total) * 100;
        sections.add(
          PieChartSectionData(
            color: _colors[colorIndex % _colors.length],
            value: amount,
            title: '${percentage.toStringAsFixed(1)}%',
            radius: 100,
            titleStyle: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        );
        colorIndex++;
      }
    });

    return RepaintBoundary(
      key: _branchChartKey,
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            SizedBox(
              height: 300,
              child: PieChart(
                PieChartData(
                  sections: sections,
                  centerSpaceRadius: 40,
                  sectionsSpace: 2,
                ),
              ),
            ),
            const SizedBox(height: 16),
            _buildLegend(branchData.keys.toList()),
          ],
        ),
      ),
    );
  }

  Widget _buildProductAnalysisChart() {
    final productData =
        _analyticsData['productAnalysis'] as Map<String, dynamic>? ?? {};

    if (productData.isEmpty) {
      return const SizedBox(
        height: 200,
        child: Center(child: Text('No product analysis data available')),
      );
    }

    final sections = <PieChartSectionData>[];
    int colorIndex = 0;
    double total = 0;

    productData.forEach((product, data) {
      final buy = (data['buy'] as num?)?.toDouble() ?? 0.0;
      final sell = (data['sell'] as num?)?.toDouble() ?? 0.0;
      total += (buy + sell);
    });

    productData.forEach((product, data) {
      final buy = (data['buy'] as num?)?.toDouble() ?? 0.0;
      final sell = (data['sell'] as num?)?.toDouble() ?? 0.0;
      final productTotal = buy + sell;

      if (productTotal > 0) {
        final percentage = (productTotal / total) * 100;
        sections.add(
          PieChartSectionData(
            color: _colors[colorIndex % _colors.length],
            value: productTotal,
            title: '${percentage.toStringAsFixed(1)}%',
            radius: 100,
            titleStyle: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        );
        colorIndex++;
      }
    });

    return RepaintBoundary(
      key: _productChartKey,
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            SizedBox(
              height: 300,
              child: PieChart(
                PieChartData(
                  sections: sections,
                  centerSpaceRadius: 40,
                  sectionsSpace: 2,
                ),
              ),
            ),
            const SizedBox(height: 16),
            _buildLegend(productData.keys.toList()),
          ],
        ),
      ),
    );
  }

  Widget _buildMemberDistributionChart() {
    final memberData =
        _analyticsData['memberDistribution'] as Map<String, dynamic>? ?? {};

    if (memberData.isEmpty) {
      return const SizedBox(
        height: 200,
        child: Center(child: Text('No member distribution data available')),
      );
    }

    final sections = <PieChartSectionData>[];
    int colorIndex = 0;
    double total = 0;

    memberData.forEach((branch, count) {
      total += (count as num).toDouble();
    });

    memberData.forEach((branch, count) {
      final memberCount = (count as num).toDouble();
      if (memberCount > 0) {
        final percentage = (memberCount / total) * 100;
        sections.add(
          PieChartSectionData(
            color: _colors[colorIndex % _colors.length],
            value: memberCount,
            title: '${percentage.toStringAsFixed(1)}%',
            radius: 100,
            titleStyle: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        );
        colorIndex++;
      }
    });

    return RepaintBoundary(
      key: _memberChartKey,
      child: Container(
        color: Colors.white,
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            SizedBox(
              height: 300,
              child: PieChart(
                PieChartData(
                  sections: sections,
                  centerSpaceRadius: 40,
                  sectionsSpace: 2,
                ),
              ),
            ),
            const SizedBox(height: 16),
            _buildLegend(memberData.keys.toList()),
          ],
        ),
      ),
    );
  }

  Widget _buildLegend(List<String> labels) {
    return Wrap(
      spacing: 20,
      runSpacing: 10,
      children: labels.asMap().entries.map((entry) {
        final index = entry.key;
        final label = entry.value;
        return SizedBox(
          width: 150,
          child: Row(
            children: [
              Container(
                width: 16,
                height: 16,
                color: _colors[index % _colors.length],
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontSize: 14),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Future<void> _exportToPdf() async {
    try {
      // Capture charts as images
      final branchImage = await _captureChart(_branchChartKey);
      final productImage = await _captureChart(_productChartKey);
      final memberImage = await _captureChart(_memberChartKey);

      // Generate PDF with charts
      await ReportService.generateVisualAnalyticsPdf(
        branchImage: branchImage,
        productImage: productImage,
        memberImage: memberImage,
        analyticsData: _analyticsData,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('PDF generated successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error generating PDF: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<ui.Image> _captureChart(GlobalKey key) async {
    final boundary =
        key.currentContext!.findRenderObject() as RenderRepaintBoundary;
    final image = await boundary.toImage(pixelRatio: 2.0);
    return image;
  }
}
