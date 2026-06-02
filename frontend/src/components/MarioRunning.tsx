import { useEffect, useState } from 'react'

// 奥特曼帧 - 出拳
const ultramanPunch = [
  '    ████████    ',
  '   █████████   ',
  '  ██  ██████   ',
  ' ███████████   ',
  ' ███████ ███   ',
  '  ██ █████     ',
  ' ███████ █     ',
  ' ███████████   ',
  '  ███████ █    ',
  '   ██   ██     ',
  '  ██     ██    ',
  ' ██       ██   ',
]

// 怪兽帧 - 被打倒退
const monsterHit = [
  '  █████████    ',
  ' ████ ██████   ',
  ' ████████████  ',
  ' ████████████  ',
  '  █████████    ',
  '  ███ ███ ██   ',
  ' ███████████   ',
  ' ████████████  ',
  '  ███   ███    ',
  '  ██     ██    ',
  ' ███     ███   ',
  ' ████   ████   ',
]

// 奥特曼帧 - 踢腿
const ultramanKick = [
  '    ████████    ',
  '   █████████   ',
  '  ██  ██████   ',
  ' ███████████   ',
  ' ███████ ███   ',
  '  ██ █████     ',
  ' █████████     ',
  ' ███████████   ',
  '  ███████ █    ',
  '   ██   ██     ',
  '  ██     ████  ',
  ' ██       ████ ',
]

// 怪兽帧 - 被击飞
const monsterFly = [
  '    █████████    ',
  '   ████ ██████   ',
  '   ████████████  ',
  '    ███████████  ',
  '    █████████    ',
  '    ███ ███ ██   ',
  '     █████████   ',
  '   ████████████  ',
  '    ███   ███    ',
  '    ██     ██    ',
  '   ███     ███   ',
  '  ████     ████  ',
]

function pixelLine(line: string, key: number) {
  return (
    <div key={key} style={{ display: 'flex', gap: 0, lineHeight: 0 }}>
      {line.split('').map((ch, j) => (
        <span
          key={j}
          style={{
            display: 'inline-block',
            width: 4,
            height: 4,
            background: ch === '█' ? undefined : 'transparent',
            backgroundColor: ch === '█' ? undefined : undefined,
          }}
        >
          {ch === '█' ? (
            <span style={{ display: 'block', width: 4, height: 4 }} />
          ) : null}
        </span>
      ))}
    </div>
  )
}

// Custom pixel renderer with colors
function renderPixelArt(
  lines: string[],
  colors: Record<string, string>,
) {
  return (
    <div style={{ transform: 'scale(1.2)', transformOrigin: 'bottom center' }}>
      {lines.map((line, i) => (
        <div key={i} style={{ display: 'flex', lineHeight: 0 }}>
          {line.split('').map((ch, j) => {
            const bg = ch === '█' ? (colors[`${i},${j}`] || colors.default || '#ccc') : 'transparent'
            return (
              <span
                key={j}
                style={{
                  display: 'inline-block',
                  width: 4,
                  height: 4,
                  backgroundColor: bg,
                  borderRadius: 0,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

function getUltramanColors(isKicking: boolean) {
  return {
    default: '#c0c0c0',
    // Body - red/silver
    '0,4': '#e53e30', '0,5': '#e53e30', '0,6': '#e53e30', '0,7': '#e53e30',
    '1,3': '#e53e30', '1,4': '#e53e30', '1,5': '#e53e30', '1,6': '#e53e30', '1,7': '#e53e30', '1,8': '#e53e30',
    '2,2': '#e53e30', '2,3': '#e53e30', '2,6': '#e53e30', '2,7': '#e53e30', '2,8': '#e53e30', '2,9': '#e53e30',
    '3,0': '#e53e30', '3,1': '#e53e30', '3,2': '#e53e30', '3,3': '#e53e30', '3,4': '#e53e30', '3,5': '#e53e30', '3,6': '#e53e30', '3,7': '#e53e30', '3,8': '#e53e30', '3,9': '#e53e30', '3,10': '#e53e30',
    '4,0': '#e53e30', '4,1': '#e53e30', '4,2': '#e53e30', '4,3': '#e53e30', '4,4': '#e53e30', '4,5': '#e53e30', '4,6': '#e53e30',
    '4,8': '#e53e30', '4,9': '#e53e30', '4,10': '#e53e30',
    // Eyes - yellow
    '2,4': '#ffd700', '2,5': '#ffd700',
  }
}

function getMonsterColors() {
  return {
    default: '#6b8e23',
    // Body - olive green
    '0,2': '#556b2f', '0,3': '#556b2f', '0,4': '#556b2f', '0,5': '#556b2f', '0,6': '#556b2f', '0,7': '#556b2f',
    '1,1': '#556b2f', '1,2': '#556b2f', '1,5': '#556b2f', '1,6': '#556b2f', '1,7': '#556b2f', '1,8': '#556b2f',
    '2,0': '#556b2f', '2,1': '#556b2f', '2,2': '#556b2f', '2,3': '#556b2f', '2,4': '#556b2f', '2,5': '#556b2f', '2,6': '#556b2f', '2,7': '#556b2f', '2,8': '#556b2f', '2,9': '#556b2f', '2,10': '#556b2f', '2,11': '#556b2f',
    '3,0': '#556b2f', '3,1': '#556b2f', '3,2': '#556b2f', '3,3': '#556b2f', '3,4': '#556b2f', '3,5': '#556b2f', '3,6': '#556b2f', '3,7': '#556b2f', '3,8': '#556b2f', '3,9': '#556b2f', '3,10': '#556b2f', '3,11': '#556b2f',
    '4,2': '#556b2f', '4,3': '#556b2f', '4,4': '#556b2f', '4,5': '#556b2f', '4,6': '#556b2f', '4,7': '#556b2f', '4,8': '#556b2f',
    // Eyes - red
    '1,3': '#ff4444', '1,4': '#ff4444',
  }
}

export default function MarioRunning() {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setPhase((f) => (f + 1) % 4), 400)
    return () => clearInterval(t)
  }, [])

  const isPunch = phase === 0 || phase === 2
  const isKick = phase === 1 || phase === 3

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, paddingBottom: 12 }}>
        {/* Ultraman */}
        <div style={{ position: 'relative' }}>
          {renderPixelArt(
            isKick ? ultramanKick : ultramanPunch,
            getUltramanColors(isKick),
          )}
        </div>

        {/* Hit / action effect */}
        {(phase === 1 || phase === 3) && (
          <div
            style={{
              position: 'absolute',
              marginLeft: 60,
              marginBottom: 40,
              fontSize: 16,
              fontWeight: 'bold',
              color: '#ffd700',
              animation: 'hitFlash 0.3s ease-out',
            }}
          >
            💥
          </div>
        )}

        {/* Monster */}
        <div style={{
          opacity: phase >= 2 ? 0.7 : 1,
          transform: phase >= 2 ? 'translateX(8px)' : 'translateX(0)',
          transition: 'all 0.3s',
        }}>
          {renderPixelArt(
            phase >= 2 ? monsterFly : monsterHit,
            getMonsterColors(),
          )}
        </div>
      </div>

      {/* Ground */}
      <div style={{
        width: 200,
        height: 3,
        background: '#8B4513',
        borderRadius: 1,
        marginTop: -4,
      }} />

      <style>{`
        @keyframes hitFlash {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
