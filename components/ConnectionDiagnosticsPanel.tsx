/**
 * 连接诊断面板组件
 * 显示实时连接状态、错误信息和解决建议
 */

"use client";

import React, { useState, useEffect } from 'react';
import { runDiagnostics, generateDiagnosticReport, getConnectionAdvice } from '@/lib/connection-diagnosis';
import { performanceMonitor } from '@/lib/performance-monitor';

interface ConnectionDiagnosticsPanelProps {
  websocketConnected: boolean;
  iceCandidatesCollected: number;
  iceCandidateTypes: { host: number; srflx: number; relay: number };
  p2pConnected: boolean;
  selectedCandidateType: string | null;
  latency: number | null;
  isMobile: boolean;
  onExportReport?: () => void;
}

export default function ConnectionDiagnosticsPanel({
  websocketConnected,
  iceCandidatesCollected,
  iceCandidateTypes,
  p2pConnected,
  selectedCandidateType,
  latency,
  isMobile,
  onExportReport
}: ConnectionDiagnosticsPanelProps) {
  const [diagnostics, setDiagnostics] = useState<Array<{
    category: 'critical' | 'warning' | 'info' | 'success';
    message: string;
    solution?: string;
    icon: string;
  }>>([]);

  const [showDetails, setShowDetails] = useState(false);
  const [advice, setAdvice] = useState<string[]>([]);

  useEffect(() => {
    const stats = {
      websocketConnected,
      iceCandidatesCollected,
      iceCandidateTypes,
      p2pConnected,
      selectedCandidateType,
      latency
    };

    const results = runDiagnostics(stats);
    setDiagnostics(results);
    setAdvice(getConnectionAdvice(isMobile));
  }, [websocketConnected, iceCandidatesCollected, iceCandidateTypes, p2pConnected, selectedCandidateType, latency, isMobile]);

  const categoryColors = {
    critical: 'bg-red-100 border-red-500 text-red-800',
    warning: 'bg-yellow-100 border-yellow-500 text-yellow-800',
    info: 'bg-blue-100 border-blue-500 text-blue-800',
    success: 'bg-green-100 border-green-500 text-green-800'
  };

  const categoryIcons = {
    critical: '🔴',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅'
  };

  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          🔍 连接诊断
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          {showDetails ? '收起' : '展开详情'}
        </button>
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-2 rounded bg-gray-50">
          <div className="text-2xl font-bold">
            {websocketConnected ? '✅' : '❌'}
          </div>
          <div className="text-xs text-gray-600">WebSocket</div>
        </div>
        <div className="text-center p-2 rounded bg-gray-50">
          <div className="text-2xl font-bold">{iceCandidatesCollected}</div>
          <div className="text-xs text-gray-600">ICE 候选</div>
        </div>
        <div className="text-center p-2 rounded bg-gray-50">
          <div className="text-2xl font-bold">
            {p2pConnected ? '✅' : '⏳'}
          </div>
          <div className="text-xs text-gray-600">P2P 连接</div>
        </div>
        <div className="text-center p-2 rounded bg-gray-50">
          <div className="text-2xl font-bold">
            {latency !== null ? `${latency}ms` : '-'}
          </div>
          <div className="text-xs text-gray-600">延迟</div>
        </div>
      </div>

      {/* 诊断结果 */}
      {diagnostics.length > 0 && (
        <div className="space-y-2 mb-4">
          {diagnostics.map((result, index) => (
            <div
              key={index}
              className={`p-2 rounded border-l-4 ${categoryColors[result.category]}`}
            >
              <div className="font-medium flex items-center gap-2">
                {result.icon} {result.message}
              </div>
              {result.solution && (
                <div className="text-sm mt-1 opacity-90">
                  💡 {result.solution}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 详细信息 */}
      {showDetails && (
        <div className="border-t pt-4 space-y-4">
          {/* ICE 候选详情 */}
          <div>
            <h4 className="font-semibold text-sm mb-2">ICE 候选类型</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="font-bold">{iceCandidateTypes.host}</div>
                <div className="text-xs text-gray-600">Host (本地)</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-bold">{iceCandidateTypes.srflx}</div>
                <div className="text-xs text-gray-600">STUN (公网)</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded">
                <div className="font-bold">{iceCandidateTypes.relay}</div>
                <div className="text-xs text-gray-600">TURN (中继)</div>
              </div>
            </div>
          </div>

          {/* 连接建议 */}
          <div>
            <h4 className="font-semibold text-sm mb-2">连接建议</h4>
            <ul className="text-sm space-y-1">
              {advice.map((line, index) => (
                <li key={index} className="text-gray-700">
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const report = generateDiagnosticReport(
                  {
                    websocketConnected,
                    iceCandidatesCollected,
                    iceCandidateTypes,
                    p2pConnected,
                    selectedCandidateType,
                    latency
                  },
                  isMobile
                );
                console.log(report);
                alert('诊断报告已生成，请查看控制台');
                if (onExportReport) onExportReport();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              📋 导出诊断报告
            </button>
            <button
              onClick={() => {
                performanceMonitor.clear();
                window.location.reload();
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
            >
              🔄 刷新连接
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
