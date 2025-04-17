// FILE: api/agent/pedidos.js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  try {
    // pull out the known params
    let { startDate, endDate, id } = req.query;

    // if no explicit id, check for a single key that looks like a date
    if (!id) {
      const otherKeys = Object.keys(req.query).filter(k => k !== 'startDate' && k !== 'endDate');
      if (otherKeys.length === 1 && /^\d{4}-\d{2}-\d{2}$/.test(otherKeys[0])) {
        // treat "?2023-04-17" as startDate AND endDate
        startDate = endDate = otherKeys[0];
      }
    }

    let data, error;

    if (id) {
      // 1) Fetch single pedido by its ID
      ({ data, error } = await supabase
        .from('supplier_pedidos')
        .select('*')
        .eq('id', id)
        .single()
      );

    } else {
      // 2) If no id, require at least startDate
      if (!startDate) {
        return res
          .status(400)
          .json({ error: 'É necessário informar id (ex: ?id=47) ou uma data (ex: ?2023-04-17) ou um intervalo (?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD).' });
      }
      // if only one date was provided above, startDate===endDate
      // else both must be present
      if (!endDate) {
        return res
          .status(400)
          .json({ error: 'Quando usando intervalo, startDate e endDate são obrigatórios.' });
      }

      // 2a) Fetch pedidos in the date range (inclusive)
      ({ data, error } = await supabase
        .from('supplier_pedidos')
        .select('*')
        .gte('data_venda', startDate)
        .lte('data_venda', endDate)
        .order('data_venda', { ascending: false })
      );
    }

    if (error) throw error;
    return res.status(200).json(data);

  } catch (err) {
    console.error('Erro no servidor:', err);
    return res.status(500).json({ error: err.message });
  }
};
