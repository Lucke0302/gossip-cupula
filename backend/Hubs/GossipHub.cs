using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace GossipCupula.Api.Hubs;

/// <summary>
/// Hub SignalR usado para notificações em tempo real (novos posts e votos).
/// Exige autenticação JWT: nenhum dado é transmitido sem token válido.
/// </summary>
[Authorize]
public class GossipHub : Hub
{
}
