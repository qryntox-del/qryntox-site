const OrderRow = ({ order }) => {
  return (
    <div className="p-4 border-b flex justify-between items-center bg-white hover:bg-gray-50 transition-colors">
      <div>
        <span className="text-sm text-gray-600 block mb-1">Order: {order?.id || 'N/A'}</span>
        <span className="text-sm font-bold text-gray-900">{order?.name || 'Customer'}</span>
      </div>
      <div className="text-sm text-gray-500 font-medium">
         {order?.status || 'Processing'}
      </div>
    </div>
  );
};

window.OrderRow = OrderRow;