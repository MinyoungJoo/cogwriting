export const api = {
    participants: {
        get: async (id: string) => {
            const res = await fetch(`/api/participants?id=${id}`);
            if (!res.ok) throw new Error('Participant not found');
            return res.json();
        },
        create: async (data: any) => {
            const res = await fetch('/api/participants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errorText = await res.text();
                console.error(`Failed to create participant: ${res.status} ${res.statusText}`, errorText);
                throw new Error(`Failed to create participant: ${res.status} ${errorText}`);
            }
            return res.json();
        },
        update: async (id: string, data: any) => {
            const res = await fetch('/api/participants', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ _id: id, ...data }),
            });
            if (!res.ok) throw new Error('Failed to update participant');
            return res.json();
        }
    },
    sessions: {
        create: async (data: any) => {
            const res = await fetch('/api/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.text();
                throw new Error(`Failed to create session: ${err}`);
            }
            return res.json();
        },
        update: async (data: any) => {
            const res = await fetch('/api/sessions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            return res.json();
        },
        list: async (page = 1, limit = 10) => {
            const res = await fetch(`/api/sessions?page=${page}&limit=${limit}`);
            if (!res.ok) throw new Error('Failed to fetch sessions');
            return res.json();
        },
        get: async (id: string) => {
            const res = await fetch(`/api/sessions?id=${id}`);
            if (!res.ok) throw new Error('Failed to fetch session');
            return res.json();
        }
    },
    logs: {
        save: async (batch: any) => {
            // batch: { session_id, events: [...] }
            const res = await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batch),
            });
            return res.json();
        },
        saveInteraction: async (data: any) => {
            const res = await fetch('/api/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to save interaction: ${res.status} ${errorText}`);
            }
            return res.json();
        },
        updateInteraction: async (id: string, updates: any) => {
            const res = await fetch('/api/interactions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interaction_id: id, ...updates }),
            });
            if (!res.ok) throw new Error('Failed to update interaction');
            return res.json();
        },
        saveChatLog: async (data: any) => {
            const res = await fetch('/api/chat-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to save chat log: ${res.status} ${errorText}`);
            }
            return res.json();
        },
        get: async (sessionId: string) => {
            const res = await fetch(`/api/logs?session_id=${sessionId}`);
            if (!res.ok) throw new Error('Failed to fetch logs');
            return res.json();
        },
        getInteractions: async (sessionId: string) => {
            const res = await fetch(`/api/interactions?session_id=${sessionId}`);
            if (!res.ok) throw new Error('Failed to fetch interactions');
            return res.json();
        },
        getChatLogs: async (sessionId: string) => {
            const res = await fetch(`/api/chat-logs?session_id=${sessionId}`);
            if (!res.ok) throw new Error('Failed to fetch chat logs');
            return res.json();
        }
    }
};
