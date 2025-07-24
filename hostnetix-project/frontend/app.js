document.addEventListener('DOMContentLoaded', () => {
    const servicesTbody = document.getElementById('services-tbody');
    const addServiceForm = document.getElementById('add-service-form');
    const dbStatusSpan = document.getElementById('db-status');
    const statusBar = document.getElementById('status-bar');
    const timeSpan = document.getElementById('time');

    const API_BASE_URL = '/api'; // All API calls go through the gateway

    // Function to fetch and render services
    const fetchServices = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/services`);
            if (!response.ok) {
                throw new Error(`API responded with status: ${response.status}`);
            }
            const services = await response.json();
            
            servicesTbody.innerHTML = ''; // Clear existing rows
            if (services.length === 0) {
                servicesTbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No services in inventory.</td></tr>';
            } else {
                services.forEach(service => {
                    const row = document.createElement('tr');
                    row.style.backgroundColor = service.status === 'Sold' ? '#343a40' : '#2c3034';
                    row.innerHTML = `
                        <td>${service.hostname}</td>
                        <td>${service.ip_address}</td>
                        <td style="color: ${service.status === 'Sold' ? '#ffc107' : '#28a745'};">${service.status}</td>
                        <td>${service.time}</td>
                        <td style="display: flex; gap: 10px; align-items: center;">
                            ${service.status === 'Available' ? `<button class="btn sell" data-id="${service.id}">Sell</button>` : ''}
                            <button class="btn delete" data-id="${service.id}">Delete</button>
                        </td>
                    `;
                    servicesTbody.appendChild(row);
                });
            }
            // Update DB status on successful fetch
            dbStatusSpan.textContent = 'Connection to PostgreSQL database is stable.';
            statusBar.style.backgroundColor = '#28a745';

        } catch (error) {
            console.error('Error fetching services:', error);
            dbStatusSpan.textContent = `Failed to connect to the backend API. ${error.message}`;
            statusBar.style.backgroundColor = '#dc3545';
        }
    };

    // Event listener for adding a new service
    addServiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const hostname = document.getElementById('hostname').value;
        const ip_address = document.getElementById('ip_address').value;

        try {
            await fetch(`${API_BASE_URL}/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hostname, ip_address }),
            });
            addServiceForm.reset();
            fetchServices(); // Refresh the list
        } catch (error) {
            console.error('Error adding service:', error);
        }
    });

    // Event delegation for sell and delete buttons
    servicesTbody.addEventListener('click', async (e) => {
        const target = e.target;
        const id = target.dataset.id;

        if (target.classList.contains('delete')) {
            if (confirm(`Are you sure you want to delete service ID ${id}?`)) {
                try {
                    await fetch(`${API_BASE_URL}/services/${id}`, { method: 'DELETE' });
                    fetchServices(); // Refresh list
                } catch (error) {
                    console.error('Error deleting service:', error);
                }
            }
        }

        if (target.classList.contains('sell')) {
            try {
                await fetch(`${API_BASE_URL}/services/${id}/sell`, { method: 'POST' });
                fetchServices(); // Refresh list
            } catch (error) {
                console.error('Error selling service:', error);
            }
        }
    });
    
    // Update Panama time every second
    setInterval(() => {
        timeSpan.textContent = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Panama' });
    }, 1000);

    // Initial fetch of services
    fetchServices();
});

