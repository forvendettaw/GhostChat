"use client";

import { useState } from "react";
import { setPeerJSConfig, clearPeerJSConfig, getPeerJSConfig } from "@/lib/peer-manager";

export default function Settings({ onClose }: { onClose: () => void }) {
  const config = getPeerJSConfig();
  const [host, setHost] = useState(config.host === '0.peerjs.com (default)' ? '' : config.host);
  const [port, setPort] = useState(config.port === '443' ? '' : config.port);
  const [path, setPath] = useState(config.path === '/' ? '' : config.path);
  const [key, setKey] = useState(config.key === 'peerjs' ? '' : config.key);

  const handleSave = () => {
    if (host) {
      setPeerJSConfig(
        host,
        port ? parseInt(port) : 443,
        path || '/',
        key || 'peerjs'
      );
      alert('Settings saved! Reload the page to apply changes.');
    } else {
      clearPeerJSConfig();
      alert('Using default PeerJS server. Reload the page to apply changes.');
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#1a1a1a',
        padding: 24,
        borderRadius: 12,
        maxWidth: 400,
        width: '90%',
        border: '1px solid #333'
      }}>
        <h3 style={{ marginBottom: 16 }}>PeerJS Server Settings</h3>
        
        <div style={{ marginBottom: 12, fontSize: 12, opacity: 0.7 }}>
          Leave empty to use default free server (0.peerjs.com)
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, marginBottom: 4, opacity: 0.8 }}>
            Host
          </label>
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="0.peerjs.com"
            style={{
              width: '100%',
              padding: 8,
              background: '#111',
              border: '1px solid #333',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, marginBottom: 4, opacity: 0.8 }}>
            Port
          </label>
          <input
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="443"
            style={{
              width: '100%',
              padding: 8,
              background: '#111',
              border: '1px solid #333',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12
            }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, marginBottom: 4, opacity: 0.8 }}>
            Path
          </label>
          <input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/"
            style={{
              width: '100%',
              padding: 8,
              background: '#111',
              border: '1px solid #333',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 11, marginBottom: 4, opacity: 0.8 }}>
            API Key
          </label>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="peerjs"
            style={{
              width: '100%',
              padding: 8,
              background: '#111',
              border: '1px solid #333',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: 10,
              background: '#fff',
              border: 'none',
              borderRadius: 8,
              color: '#000',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Save
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: 10,
              background: '#333',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
