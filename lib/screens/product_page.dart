import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../services/product_service.dart';

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
    // Load persisted products and refresh UI
    ProductService.init().then((_) {
      setState(() {});
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
    final soldCtrl = TextEditingController(
      text: product != null ? product.soldPerMonth.toString() : '0',
    );
    final boughtCtrl = TextEditingController(
      text: product != null ? product.boughtPerMonth.toString() : '0',
    );
    final stockCtrl = TextEditingController(
      text: product != null ? product.currentStock.toString() : '0',
    );
    List<String> images = List.from(product?.images ?? []);

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
                              Image.file(
                                File(img),
                                width: 80,
                                height: 80,
                                fit: BoxFit.cover,
                              ),
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
                    const SizedBox(height: 8),
                    TextField(
                      controller: priceCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Price (LKR)',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: costCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Cost (LKR)',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: soldCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Sold per month (kg)',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: boughtCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Bought per month (kg)',
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: stockCtrl,
                      readOnly: false, // Made editable
                      decoration: const InputDecoration(
                        labelText:
                            'Available Stock (kg)', // Removed [Auto-calculated]
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
                  onPressed: () {
                    final name = nameCtrl.text.trim();
                    final desc = descCtrl.text.trim();
                    final price = double.tryParse(priceCtrl.text.trim()) ?? 0.0;
                    final cost = double.tryParse(costCtrl.text.trim()) ?? 0.0;
                    final sold = double.tryParse(soldCtrl.text.trim()) ?? 0.0;
                    final bought =
                        double.tryParse(boughtCtrl.text.trim()) ?? 0.0;
                    final stock = double.tryParse(stockCtrl.text.trim()) ?? 0.0;

                    // Validation
                    if (name.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Name is required')),
                      );
                      return;
                    }
                    if (price < 0 ||
                        cost < 0 ||
                        sold < 0 ||
                        bought < 0 ||
                        stock < 0) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('All values must be non-negative'),
                        ),
                      );
                      return;
                    }
                    // Removed logic check that forced bought >= sold, as they are independent monthly stats
                    // and stock is separate.

                    if (isEdit) {
                      final updated = Product(
                        id: product.id,
                        name: name,
                        description: desc,
                        price: price,
                        cost: cost,
                        images: images,
                        soldPerMonth: sold,
                        boughtPerMonth: bought,
                        currentStock: stock,
                        createdAt: product.createdAt,
                      );
                      ProductService.updateProduct(product.id, updated);
                    } else {
                      final created = ProductService.create(
                        name: name,
                        description: desc,
                        price: price,
                        cost: cost,
                        images: images,
                        soldPerMonth: sold,
                        boughtPerMonth: bought,
                        currentStock: stock,
                        createdAt: DateTime.now(),
                      );
                      ProductService.addProduct(created);
                    }

                    setState(() {});
                    Navigator.of(context).pop();
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
                  child: Image.file(File(p.images.first), fit: BoxFit.cover),
                ),
              const SizedBox(height: 8),
              Text('Description: ${p.description}'),
              const SizedBox(height: 6),
              Text('Price: LKR ${p.price.toStringAsFixed(2)}'),
              const SizedBox(height: 6),
              Text('Cost: LKR ${p.cost.toStringAsFixed(2)}'),
              const SizedBox(height: 6),
              Text('Sold / month: ${p.soldPerMonth.toStringAsFixed(2)} kg'),
              const SizedBox(height: 6),
              Text('Bought / month: ${p.boughtPerMonth.toStringAsFixed(2)} kg'),
              const SizedBox(height: 6),
              Text('Current stock: ${p.currentStock.toStringAsFixed(2)} kg'),
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
    final totalSell = ProductService.totalSelling();
    final totalBuy = ProductService.totalBuying();
    final income = ProductService.monthlyIncome();
    final outcome = ProductService.monthlyOutcome();

    return Card(
      margin: const EdgeInsets.all(12),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Selling', style: TextStyle(fontSize: 14)),
                    const SizedBox(height: 6),
                    Text(
                      'LKR ${totalSell.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Buying', style: TextStyle(fontSize: 14)),
                    const SizedBox(height: 6),
                    Text(
                      'LKR ${totalBuy.toStringAsFixed(2)}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.red,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
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
    final stockMap = ProductService.getStockByProduct();
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
            if (stockMap.isEmpty)
              const Text('No products', style: TextStyle(color: Colors.grey))
            else
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: stockMap.entries.map((e) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(e.key, style: const TextStyle(fontSize: 12)),
                        Text(
                          '${e.value.toStringAsFixed(2)} kg',
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
                    leading: p.images.isNotEmpty
                        ? Image.file(
                            File(p.images.first),
                            width: 56,
                            height: 56,
                            fit: BoxFit.cover,
                          )
                        : const SizedBox(
                            width: 56,
                            height: 56,
                            child: Icon(Icons.image),
                          ),
                    title: Text(p.name),
                    subtitle: Text(
                      'LKR ${p.price.toStringAsFixed(2)} · ${p.soldPerMonth.toStringAsFixed(2)} kg/mo\n${p.description}',
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
                        IconButton(
                          icon: const Icon(Icons.edit, color: Colors.blue),
                          onPressed: () => _openAddEditDialog(product: p),
                        ),
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
                                    onPressed: () => Navigator.of(c).pop(false),
                                    child: const Text('Cancel'),
                                  ),
                                  TextButton(
                                    onPressed: () => Navigator.of(c).pop(true),
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
      floatingActionButton: FloatingActionButton(
        heroTag: 'product_fab',
        onPressed: () => _openAddEditDialog(),
        child: const Icon(Icons.add),
      ),
    );
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
