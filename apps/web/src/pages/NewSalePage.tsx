import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import SaleDocumentForm from '../components/SaleDocumentForm';
import { CartItem } from '../../../packages/shared/types';

export default function NewSalePage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('pos-cart');
      if (stored) setCart(JSON.parse(stored));
    } catch { setCart([]); }
  }, []);

  const handleSave = async (data: any) => {
    try {
      await api.createSale({
        tipo: 'NOTA_VENTA',
        clienteId: data.clienteId || null,
        items: data.items,
        metodoPago: data.metodoPago,
        pagos: data.pagos,
        observacion: data.observacion,
        direccionEnvio: data.direccionEnvio,
        origenCompra: data.origenCompra,
      });
      localStorage.removeItem('pos-cart');
      navigate('/history');
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  return <SaleDocumentForm tipo="NOTA_VENTA" initialCart={cart} onSave={handleSave} />;
}
