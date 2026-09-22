using GossipCupula.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace GossipCupula.Api.Workers;

public class AivenKeepAliveWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AivenKeepAliveWorker> _logger;

    public AivenKeepAliveWorker(IServiceScopeFactory scopeFactory, ILogger<AivenKeepAliveWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Aiven Keep-Alive Worker iniciado.");

        // Define o intervalo para 12 horas (metade do tempo de tolerância do Aiven para garantir)
        using var timer = new PeriodicTimer(TimeSpan.FromHours(12));

        // O loop roda até a API ser desligada
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                // Como o Worker é um Singleton, precisamos criar um escopo para chamar o AppDbContext (que é Scoped)
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                // Executa um comando super leve direto no banco
                await dbContext.Database.ExecuteSqlRawAsync("SELECT 1", stoppingToken);
                
                _logger.LogInformation($"[{DateTime.UtcNow:O}] Ping de inatividade enviado ao Aiven com sucesso.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Falha ao enviar o ping de inatividade para o Aiven.");
            }
        }
    }
}