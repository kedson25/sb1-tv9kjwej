import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { WorkOrder } from '../types/database';
import { Plus, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface WorkOrdersProps {
  teamId: string;
  isLeader: boolean;
}

export default function WorkOrders({ teamId, isLeader }: WorkOrdersProps) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newWorkOrder, setNewWorkOrder] = useState({
    title: '',
    description: '',
  });

  useEffect(() => {
    loadWorkOrders();

    const subscription = supabase
      .channel(`work-orders-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_orders',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          loadWorkOrders();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [teamId]);

  const loadWorkOrders = async () => {
    const { data, error } = await supabase
      .from('work_orders')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading work orders:', error);
      return;
    }

    setWorkOrders(data);
  };

  const createWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase.from('work_orders').insert([
      {
        team_id: teamId,
        title: newWorkOrder.title,
        description: newWorkOrder.description,
        created_by: userData.user.id,
      },
    ]);

    if (error) {
      toast.error('Error creating work order');
      return;
    }

    setNewWorkOrder({ title: '', description: '' });
    setShowNewForm(false);
    toast.success('Work order created successfully');
  };

  const updateWorkOrderStatus = async (orderId: string, status: WorkOrder['status']) => {
    const { error } = await supabase
      .from('work_orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      toast.error('Error updating work order status');
      return;
    }

    toast.success('Status updated successfully');
  };

  return (
    <div className="space-y-4 p-4">
      {isLeader && (
        <div className="mb-6">
          {!showNewForm ? (
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={20} />
              <span>New Work Order</span>
            </button>
          ) : (
            <form onSubmit={createWorkOrder} className="space-y-4 bg-white p-4 rounded-lg shadow">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={newWorkOrder.title}
                  onChange={(e) => setNewWorkOrder({ ...newWorkOrder, title: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  required
                  value={newWorkOrder.description}
                  onChange={(e) => setNewWorkOrder({ ...newWorkOrder, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="space-y-4">
        {workOrders.map((order) => (
          <div key={order.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium">{order.title}</h3>
                <p className="text-gray-600 mt-1">{order.description}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-sm ${
                  order.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : order.status === 'in_progress'
                    ? 'bg-yellow-100 text-yellow-800'
                    : order.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {order.status.replace('_', ' ')}
              </span>
            </div>

            {order.status === 'pending' && (
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={() => updateWorkOrderStatus(order.id, 'in_progress')}
                  className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md hover:bg-yellow-200"
                >
                  Start Work
                </button>
                <button
                  onClick={() => updateWorkOrderStatus(order.id, 'cancelled')}
                  className="px-3 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                >
                  Cancel
                </button>
              </div>
            )}

            {order.status === 'in_progress' && (
              <button
                onClick={() => updateWorkOrderStatus(order.id, 'completed')}
                className="mt-4 px-3 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200"
              >
                Mark as Completed
              </button>
            )}
          </div>
        ))}

        {workOrders.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2">No work orders found</p>
          </div>
        )}
      </div>
    </div>
  );
}