export default function PlayerCard({ player }){
const name = player.user?.username || player.user || `Player ${player.id}`;
return (
<div style={{ background: 'white', padding: '1rem', borderRadius: 10, boxShadow: '0 2px 6px rgba(0,0,0,0.08)'}}>
<div style={{ fontWeight: 600 }}>{name}</div>
<div style={{ fontSize: 13, color:'#555' }}>Team: {player.team ? player.team.name : 'N/A'}</div>
</div>
);
}