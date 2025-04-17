// FILE: api/agent/pedidos.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  try {
    const { startDate, endDate, id } = req.query;

    let data, error;

    if (id) {
      // Fetch single pedido by its ID
      ({ data, error } = await supabase
        .from('supplier_pedidos')
        .select('*')
        .eq('id', id)
        .single()
      );
    } else {
      // If no id, require both startDate and endDate
      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ error: 'startDate e endDate são obrigatórios.' });
      }
      // Fetch pedidos in the date range
      ({ data, error } = await supabase
        .from('supplier_pedidos')
        .select('*')
        .gte('data_venda', startDate)
        .lte('data_venda', endDate)
        .order('data_venda', { ascending: false })
      );
    }

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    console.error('Erro no servidor:', err);
    res.status(500).json({ error: err.message });
  }
};
