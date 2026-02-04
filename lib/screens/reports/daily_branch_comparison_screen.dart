import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/report_service.dart';

class DailyBranchComparisonScreen extends StatefulWidget {
  const DailyBranchComparisonScreen({super.key});

  @override
  State<DailyBranchComparisonScreen> createState() =>
      _DailyBranchComparisonScreenState();
}

class _DailyBranchComparisonScreenState
    extends State<DailyBranchComparisonScreen> {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic> _comparisonData = {};

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
    Colors.lightGreen,
    Colors.deepPurple,
    Colors.lime,
    Colors.blueGrey,
  ];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final data = await ReportService.getDailyBranchComparisonData();
      if (mounted) {
        setState(() {
          _comparisonData = data;
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
        title: const Text('Daily Branch Comparison'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 1,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          if (!_isLoading && _error == null && _comparisonData.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.download),
              tooltip: 'Export to PDF',
              onPressed: () {
                ReportService.generateComparisonPdf(
                  data: _comparisonData,
                  colors: _colors,
                );
              },
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
          : _comparisonData.isEmpty
          ? const Center(child: Text('No transactions found for today.'))
          : SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Visual Analysis (Today)',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 24),
                    _buildChartSection('Daily Buy Comparison', 'buy'),
                    const SizedBox(height: 40),
                    _buildChartSection('Daily Sell Comparison', 'sell'),
                    const SizedBox(height: 40),
                    _buildLegend(),
                    const SizedBox(height: 48),
                    Center(
                      child: SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            ReportService.generateComparisonPdf(
                              data: _comparisonData,
                              colors: _colors,
                            );
                          },
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

  Widget _buildChartSection(String title, String type) {
    List<PieChartSectionData> sections = [];
    double total = 0;
    for (var entry in _comparisonData.values) {
      total += (entry[type] as num).toDouble();
    }

    int index = 0;
    for (final entry in _comparisonData.entries) {
      final branchId = entry.key;
      final totals = entry.value;
      final value = (totals[type] as num).toDouble();
      if (value > 0) {
        final percentage = (value / total) * 100;
        sections.add(
          PieChartSectionData(
            color: _colors[index % _colors.length],
            value: value,
            title: '$branchId\n${percentage.toStringAsFixed(1)}%',
            radius: 100,
            titleStyle: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
        );
      }
      index++;
    }

    if (sections.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 16),
          const SizedBox(
            height: 200,
            child: Center(child: Text('No data for this category today')),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 16),
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
      ],
    );
  }

  Widget _buildLegend() {
    List<Widget> legendItems = [];
    int index = 0;

    for (final branchId in _comparisonData.keys) {
      legendItems.add(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 4.0),
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
                  branchId,
                  style: const TextStyle(fontSize: 14),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      );
      index++;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Branch Color Key',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 20,
          runSpacing: 10,
          children: legendItems.map((item) {
            return SizedBox(width: 150, child: item);
          }).toList(),
        ),
      ],
    );
  }
}
