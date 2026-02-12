import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../services/report_service.dart';
import '../../services/employee_service.dart';

class AdvancedReportsScreen extends StatefulWidget {
  const AdvancedReportsScreen({super.key});

  @override
  State<AdvancedReportsScreen> createState() => _AdvancedReportsScreenState();
}

class _AdvancedReportsScreenState extends State<AdvancedReportsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  DateTime _startDate = DateTime.now().subtract(const Duration(days: 30));
  DateTime _endDate = DateTime.now();
  String _selectedBranch = 'All';
  bool _isLoading = false;

  // Data
  List<dynamic> _stockData = [];
  Map<String, dynamic> _financialData = {};
  List<dynamic> _fvPerformanceData = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAllData();
  }

  Future<void> _loadAllData() async {
    setState(() => _isLoading = true);
    try {
      final stock = await ReportService.getBranchStock(
        branchId: _selectedBranch,
      );
      final financials = await ReportService.getBranchFinancials(
        startDate: _startDate,
        endDate: _endDate,
      );

      List<dynamic> fvPerf = [];
      if (_selectedBranch != 'All') {
        fvPerf = await ReportService.getFVPerformance(
          branchId: _selectedBranch,
          startDate: _startDate,
          endDate: _endDate,
        );
      }

      setState(() {
        _stockData = stock;
        _financialData = financials;
        _fvPerformanceData = fvPerf;
      });
    } catch (e) {
      debugPrint('Error loading report data: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text(
          'Advanced Analytics',
          style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(onPressed: _loadAllData, icon: const Icon(Icons.refresh)),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.blueAccent,
          tabs: const [
            Tab(text: 'Stock'),
            Tab(text: 'Financials'),
            Tab(text: 'FV Performance'),
          ],
        ),
      ),
      body: Column(
        children: [
          _buildFilters(),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildStockTab(),
                _buildFinancialsTab(),
                _buildPerformanceTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.white.withValues(alpha: 0.05),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(child: _buildDateTile('From', _startDate, true)),
              const SizedBox(width: 12),
              Expanded(child: _buildDateTile('To', _endDate, false)),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(8),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: _selectedBranch,
                dropdownColor: const Color(0xFF1E293B),
                isExpanded: true,
                style: GoogleFonts.outfit(color: Colors.white),
                items: ['All', ...EmployeeService.branches].map((b) {
                  return DropdownMenuItem(value: b, child: Text(b));
                }).toList(),
                onChanged: (val) {
                  if (val != null) {
                    setState(() => _selectedBranch = val);
                    _loadAllData();
                  }
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateTile(String label, DateTime date, bool isStart) {
    return InkWell(
      onTap: () async {
        final DateTime? picked = await showDatePicker(
          context: context,
          initialDate: date,
          firstDate: DateTime(2023),
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
          _loadAllData();
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(color: Colors.white54, fontSize: 10),
            ),
            Text(
              DateFormat('MMM dd, yyyy').format(date),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStockTab() {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_stockData.isEmpty) return _buildEmptyState('No stock data found');

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: ElevatedButton.icon(
            onPressed: () => ReportService.generateStockReport(
              stockData: _stockData,
              branch: _selectedBranch,
            ),
            icon: const Icon(Icons.download),
            label: const Text('Download Stock Report'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.greenAccent.withValues(alpha: 0.1),
              foregroundColor: Colors.greenAccent,
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _stockData.length,
            itemBuilder: (context, index) {
              final item = _stockData[index];
              final stock = item['currentStock'] as num;
              return Card(
                color: Colors.white.withValues(alpha: 0.05),
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  title: Text(
                    item['productName'],
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  subtitle: Text(
                    'Branch: ${item['branchName']}',
                    style: const TextStyle(color: Colors.white54),
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '$stock',
                        style: GoogleFonts.outfit(
                          color: stock >= 0
                              ? Colors.greenAccent
                              : Colors.redAccent,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Text(
                        'In Stock',
                        style: TextStyle(color: Colors.white54, fontSize: 10),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildFinancialsTab() {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_financialData.isEmpty) {
      return _buildEmptyState('No financial data found');
    }

    final branches = _financialData.keys.toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: ElevatedButton.icon(
            onPressed: () => ReportService.generateFinancialReport(
              financialData: _financialData,
              start: _startDate,
              end: _endDate,
            ),
            icon: const Icon(Icons.download),
            label: const Text('Download Financial Report'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blueAccent.withValues(alpha: 0.1),
              foregroundColor: Colors.blueAccent,
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: branches.length,
            itemBuilder: (context, index) {
              final bName = branches[index];
              final data = _financialData[bName];
              final buy = data['buy'] as num;
              final sell = data['sell'] as num;
              final net = sell - buy;

              return Card(
                color: Colors.white.withValues(alpha: 0.05),
                margin: const EdgeInsets.only(bottom: 16),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        bName,
                        style: GoogleFonts.outfit(
                          color: Colors.blueAccent,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Divider(color: Colors.white10),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildFinanceItem(
                            'Total Buy',
                            buy,
                            Colors.orangeAccent,
                          ),
                          _buildFinanceItem(
                            'Total Sell',
                            sell,
                            Colors.greenAccent,
                          ),
                          _buildFinanceItem(
                            'Net Profit',
                            net,
                            net >= 0 ? Colors.blueAccent : Colors.redAccent,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildFinanceItem(String label, num value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(color: Colors.white54, fontSize: 12),
        ),
        Text(
          'Rs. ${NumberFormat('#,###').format(value)}',
          style: GoogleFonts.outfit(
            color: color,
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildPerformanceTab() {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_selectedBranch == 'All') {
      return _buildEmptyState(
        'Please select a specific branch to view performance',
      );
    }
    if (_fvPerformanceData.isEmpty) {
      return _buildEmptyState('No performance data for this period');
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          ElevatedButton.icon(
            onPressed: () => ReportService.generatePerformanceReport(
              performanceData: _fvPerformanceData,
              branch: _selectedBranch,
              start: _startDate,
              end: _endDate,
            ),
            icon: const Icon(Icons.download),
            label: const Text('Download Performance Report'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blueAccent.withValues(alpha: 0.1),
              foregroundColor: Colors.blueAccent,
            ),
          ),
          const SizedBox(height: 16),
          _buildPerformanceChart(),
          const SizedBox(height: 24),
          ..._fvPerformanceData.map((fv) => _buildFVCard(fv)),
        ],
      ),
    );
  }

  Widget _buildPerformanceChart() {
    final List<BarChartGroupData> barGroups = [];
    for (int i = 0; i < _fvPerformanceData.length; i++) {
      final fv = _fvPerformanceData[i];
      final sell = (fv['sellAmount'] as num).toDouble();
      barGroups.add(
        BarChartGroupData(
          x: i,
          barRods: [
            BarChartRodData(
              toY: sell,
              color: Colors.blueAccent,
              width: 16,
              borderRadius: BorderRadius.circular(4),
            ),
          ],
        ),
      );
    }

    return Container(
      height: 250,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
      ),
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY:
              _fvPerformanceData
                  .map((e) => (e['sellAmount'] as num).toDouble())
                  .reduce((a, b) => a > b ? a : b) *
              1.2,
          barGroups: barGroups,
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index >= 0 && index < _fvPerformanceData.length) {
                    final name = _fvPerformanceData[index]['name'] as String;
                    return Padding(
                      padding: const EdgeInsets.only(top: 8.0),
                      child: Text(
                        name.split(' ').first,
                        style: const TextStyle(
                          color: Colors.white54,
                          fontSize: 10,
                        ),
                      ),
                    );
                  }
                  return const Text('');
                },
              ),
            ),
            leftTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            topTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
            rightTitles: const AxisTitles(
              sideTitles: SideTitles(showTitles: false),
            ),
          ),
          gridData: const FlGridData(show: false),
          borderData: FlBorderData(show: false),
        ),
      ),
    );
  }

  Widget _buildFVCard(dynamic fv) {
    final sell = fv['sellAmount'] as num;
    final buy = fv['buyAmount'] as num;

    return Card(
      color: Colors.white.withValues(alpha: 0.05),
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: Colors.blueAccent.withValues(alpha: 0.2),
              child: const Icon(Icons.person, color: Colors.blueAccent),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    fv['name'],
                    style: GoogleFonts.outfit(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${fv['sellCount'] + fv['buyCount']} total transactions',
                    style: const TextStyle(color: Colors.white54, fontSize: 12),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  'Rs. ${NumberFormat('#,###').format(sell)}',
                  style: const TextStyle(
                    color: Colors.greenAccent,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  'Rs. ${NumberFormat('#,###').format(buy)}',
                  style: const TextStyle(
                    color: Colors.orangeAccent,
                    fontSize: 10,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.analytics_outlined,
            size: 64,
            color: Colors.white.withValues(alpha: 0.1),
          ),
          const SizedBox(height: 16),
          Text(message, style: const TextStyle(color: Colors.white54)),
        ],
      ),
    );
  }
}
