import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../config/api_config.dart';

import '../services/product_service.dart';
import '../services/member_service.dart';
import '../services/auth_service.dart';

class ProductPage extends StatefulWidget {
  const ProductPage({super.key});

  @override
  State<ProductPage> createState() => _ProductPageState();
}

class _ProductPageState extends State<ProductPage> {
  final ImagePicker _picker = ImagePicker();
  final TextEditingController _searchCtrl = TextEditingController();
  String? _filterName;

  @override
  void initState() {
    super.initState();
    // Load persisted products and members, then refresh UI
    Future.wait([ProductService.init(), MemberService.init()]).then((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _openAddEditDialog({Product? product}) async {
    final isEdit = product != null;
    final nameCtrl = TextEditingController(text: product?.name ?? '');
    final descCtrl = TextEditingController(text: product?.description ?? '');
    final priceCtrl = TextEditingController(
      text: product != null ? product.price.toString() : '',
    );
    final costCtrl = TextEditingController(
      text: product != null ? product.cost.toString() : '',
    );
    final stockCtrl = TextEditingController(
      text: product != null ? product.currentStock.toString() : '0',
    );
    List<String> images = List.from(product?.images ?? []);
    String currentUnit = product?.unit ?? 'Kg';

    // Removed auto-update stock calculation logic to prevent resetting total stock
    // based on monthly values. Stock is now manually managed.

    await showDialog<void>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            Future<void> pickImages() async {
              final files = await _picker.pickMultiImage();
              if (files.isNotEmpty) {
                setState(() {
                  images.addAll(files.map((e) => e.path));
                });
              }
            }

            // Listeners removed so stock is not overwritten automatically

            return AlertDialog(
              title: Text(isEdit ? 'Edit Product' : 'Add Product'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final img in images)
                          Stack(
                            alignment: Alignment.topRight,
                            children: [
                              _buildImageItem(img),
                              GestureDetector(
                                onTap: () {
                                  setState(() => images.remove(img));
                                },
                                child: Container(
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Colors.black54,
                                  ),
                                  child: const Icon(
                                    Icons.close,
                                    size: 16,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        GestureDetector(
                          onTap: pickImages,
                          child: Container(
                            width: 80,
                            height: 80,
                            color: Colors.grey[200],
                            child: const Icon(Icons.add_a_photo),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Name',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: descCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        border: OutlineInputBorder(),
                      ),
                      maxLines: 3,
                    ),
                    const SizedBox(height: 12),
                    InputDecorator(
                      decoration: const InputDecoration(
                        labelText: 'Unit',
                        border: OutlineInputBorder(),
                        contentPadding: EdgeInsets.symmetric(horizontal: 10),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: currentUnit,
                          isExpanded: true,
                          items: ['Kg', 'g', 'plant', 'packets']
                              .map(
                                (u) =>
                                    DropdownMenuItem(value: u, child: Text(u)),
                              )
                              .toList(),
                          onChanged: (val) {
                            if (val != null) setState(() => currentUnit = val);
                          },
                        ),
                      ),
                    ),

                    const SizedBox(height: 8),
                    TextField(
                      controller: stockCtrl,
                      readOnly: false, // Made editable
                      decoration: const InputDecoration(
                        labelText:
                            'Available Stock', // Removed [Auto-calculated]
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                TextButton(
                  onPressed: () async {
                    debugPrint('--- Save Button Pressed ---');
                    final name = nameCtrl.text.trim();
                    final desc = descCtrl.text.trim();
                    final price = double.tryParse(priceCtrl.text.trim()) ?? 0.0;
                    final cost = double.tryParse(costCtrl.text.trim()) ?? 0.0;
                    final stock = double.tryParse(stockCtrl.text.trim()) ?? 0.0;

                    debugPrint(
                      'Values: Name=$name, Stock=$stock, Images=${images.length}',
                    );

                    if (name.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Name is required')),
                      );
                      return;
                    }
                    if (stock < 0 || price < 0 || cost < 0) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Values must be non-negative'),
                        ),
                      );
                      return;
                    }

                    bool success = false;
                    if (isEdit) {
                      final updated = Product(
                        id: product.id,
                        name: name,
                        description: desc,
                        price: price,
                        cost: cost,
                        images: images,
                        soldPerMonth: product.soldPerMonth,
                        boughtPerMonth: product.boughtPerMonth,
                        currentStock: stock,
                        createdAt: product.createdAt,
                        unit: currentUnit,
                      );
                      success = await ProductService.updateProduct(
                        product.id,
                        updated,
                      );
                    } else {
                      final created = ProductService.create(
                        name: name,
                        description: desc,
                        price: price,
                        cost: cost,
                        images: images,
                        soldPerMonth: 0.0,
                        boughtPerMonth: 0.0,
                        currentStock: stock,
                        createdAt: DateTime.now(),
                        unit: currentUnit,
                      );
                      success = await ProductService.addProduct(created);
                    }

                    if (!context.mounted) return;

                    if (success) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Product saved successfully'),
                        ),
                      );
                      setState(() {});
                      Navigator.of(context).pop();
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Failed to save product')),
                      );
                    }
                  },
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showProductDetails(Product p) {
    showDialog<void>(
      context: context,
      builder: (c) => AlertDialog(
        title: Text(p.name),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (p.images.isNotEmpty)
                SizedBox(
                  height: 140,
                  width: double.infinity,
                  child: _buildProductImage(p, isLarge: true),
                ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E2329),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(
                                Icons.shopping_cart,
                                color: Colors.blue,
                                size: 16,
                              ),
                              SizedBox(width: 8),
                              Text(
                                'Total Bought',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'LKR ${p.totalBoughtValue.toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E2329),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.store, color: Colors.blue, size: 16),
                              SizedBox(width: 8),
                              Text(
                                'Total Sold',
                                style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'LKR ${p.totalSoldValue.toStringAsFixed(2)}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text('Description: ${p.description}'),
              const SizedBox(height: 6),

              Text(
                'Current stock: ${p.currentStock.toStringAsFixed(2)} ${p.unit}',
              ),
              const SizedBox(height: 6),
              Text('Created: ${p.createdAt.toLocal()}'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(c).pop(),
            child: const Text('Close'),
          ),
          if (AuthService.role != 'analyzer')
            TextButton(
              onPressed: () {
                Navigator.of(c).pop();
                _openAddEditDialog(product: p);
              },
              child: const Text('Edit'),
            ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
    final income = ProductService.monthlyIncome();
    final outcome = ProductService.monthlyOutcome();
    // Calculate totals from Members to match Dashboard logic
    final totalBought = MemberService.getMembers().fold<double>(
      0.0,
      (s, m) => s + m.totalBought,
    );
    final totalSold = MemberService.getMembers().fold<double>(
      0.0,
      (s, m) => s + m.totalSold,
    );

    return Card(
      margin: const EdgeInsets.all(12),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Financial Summary Row
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E2329),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.shopping_cart, color: Colors.blue),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Total Bought',
                              style: TextStyle(
                                color: Colors.grey,
                                fontSize: 12,
                              ),
                            ),
                            Text(
                              'LKR ${totalBought.toStringAsFixed(2)}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E2329),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.store, color: Colors.blue),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Total Sold',
                              style: TextStyle(
                                color: Colors.grey,
                                fontSize: 12,
                              ),
                            ),
                            Text(
                              'LKR ${totalSold.toStringAsFixed(2)}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            SizedBox(
              height: 140,
              child: _MonthlyBarChart(income: income, outcome: outcome),
            ),
            const SizedBox(height: 12),
            _buildStockSummary(),
          ],
        ),
      ),
    );
  }

  Widget _buildStockSummary() {
    final products = ProductService.getProducts();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Available Stock',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            if (products.isEmpty)
              const Text('No products', style: TextStyle(color: Colors.grey))
            else
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: products.map((p) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(p.name, style: const TextStyle(fontSize: 12)),
                        Text(
                          '${p.currentStock.toStringAsFixed(2)} ${p.unit}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final products = ProductService.getProducts();
    final displayedProducts = (_filterName == null || _filterName!.isEmpty)
        ? products
        : products
              .where(
                (p) =>
                    p.name.toLowerCase().contains(_filterName!.toLowerCase()),
              )
              .toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Products')),
      body: Column(
        children: [
          _buildSummaryCard(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchCtrl,
                    decoration: const InputDecoration(
                      labelText: 'Search products by name',
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (v) => setState(() => _filterName = v.trim()),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  onPressed: () {
                    _searchCtrl.clear();
                    setState(() => _filterName = null);
                  },
                  icon: const Icon(Icons.clear),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: displayedProducts.length,
              itemBuilder: (context, i) {
                final p = displayedProducts[i];
                return Card(
                  child: ListTile(
                    leading: _buildProductImage(p),
                    title: Text(p.name),
                    subtitle: Text(
                      p.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    isThreeLine: true,
                    onTap: () => _showProductDetails(p),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(
                            Icons.remove_red_eye,
                            color: Colors.grey,
                          ),
                          onPressed: () => _showProductDetails(p),
                        ),
                        if (AuthService.role != 'analyzer')
                          IconButton(
                            icon: const Icon(Icons.edit, color: Colors.blue),
                            onPressed: () => _openAddEditDialog(product: p),
                          ),
                        if (AuthService.role != 'analyzer')
                          IconButton(
                            icon: const Icon(Icons.delete, color: Colors.red),
                            onPressed: () async {
                              final ok = await showDialog<bool>(
                                context: context,
                                builder: (c) => AlertDialog(
                                  title: const Text('Delete'),
                                  content: const Text('Delete this product?'),
                                  actions: [
                                    TextButton(
                                      onPressed: () =>
                                          Navigator.of(c).pop(false),
                                      child: const Text('Cancel'),
                                    ),
                                    TextButton(
                                      onPressed: () =>
                                          Navigator.of(c).pop(true),
                                      child: const Text('Delete'),
                                    ),
                                  ],
                                ),
                              );
                              if (ok == true) {
                                ProductService.deleteProduct(p.id);
                                setState(() {});
                              }
                            },
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: (AuthService.role == 'analyzer')
          ? null
          : FloatingActionButton(
              heroTag: 'product_fab',
              onPressed: () => _openAddEditDialog(),
              child: const Icon(Icons.add),
            ),
    );
  }

  Widget _buildProductImage(Product p, {bool isLarge = false}) {
    if (p.images.isEmpty) {
      return SizedBox(
        width: isLarge ? double.infinity : 56,
        height: isLarge ? 140 : 56,
        child: const Icon(Icons.image),
      );
    }
    final path = p.images.first;
    return _buildImageItem(
      path,
      width: isLarge ? double.infinity : 56,
      height: isLarge ? 140 : 56,
    );
  }

  Widget _buildImageItem(String path, {double width = 80, double height = 80}) {
    if (path.startsWith('http')) {
      return Image.network(
        path,
        width: width,
        height: height,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => const Icon(Icons.error),
      );
    } else if (path.startsWith('uploads/') || path.startsWith('uploads\\')) {
      // Construct full URL
      final url = '${ApiConfig.rootUrl}/$path'.replaceAll('\\', '/');
      return Image.network(
        url,
        width: width,
        height: height,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => const Icon(Icons.error),
      );
    } else {
      return Image.file(
        File(path),
        width: width,
        height: height,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => const Icon(Icons.error),
      );
    }
  }
}

class _MonthlyBarChart extends StatelessWidget {
  final List<double> income;
  final List<double> outcome;

  const _MonthlyBarChart({required this.income, required this.outcome});

  @override
  Widget build(BuildContext context) {
    final maxVal = <double>[
      ...income,
      ...outcome,
    ].fold<double>(0.0, (prev, e) => e > prev ? e : prev);
    const double chartHeight = 100.0;

    final now = DateTime.now();
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: List.generate(12, (i) {
        final inc = (income.length > i) ? income[i] : 0.0;
        final out = (outcome.length > i) ? outcome[i] : 0.0;
        final incH = maxVal > 0 ? (inc / maxVal) * chartHeight : 0.0;
        final outH = maxVal > 0 ? (out / maxVal) * chartHeight : 0.0;

        final monthDate = DateTime(now.year, now.month - 11 + i, 1);
        final label = monthNames[monthDate.month - 1];

        return Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              SizedBox(
                height: chartHeight,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(width: 10, height: incH, color: Colors.green),
                    const SizedBox(width: 6),
                    Container(width: 10, height: outH, color: Colors.red),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              Text(label, style: const TextStyle(fontSize: 10)),
            ],
          ),
        );
      }),
    );
  }
}
