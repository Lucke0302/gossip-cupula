using System.Text;
using GossipCupula.Api.Data;
using GossipCupula.Api.Hubs;
using GossipCupula.Api.Models;
using GossipCupula.Api.Services;
using GossipCupula.Api.Workers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Configura a documentação OpenAPI/Swagger para testar a API no navegador.
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "GossipCupula.Api",
        Version = "v1",
        Description = "API backend do blog/rede social estilo Gossip Girl (Auth, Posts, Votos e SignalR)."
    });

    // Habilita o botão "Authorize" no Swagger UI para inserir o token JWT,
    // que será enviado no header "Authorization: Bearer {token}".
    options.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Insira o token JWT no formato: Bearer {seu token}"
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("bearer", document)] = []
    });
});

// Configura o SignalR para notificações em tempo real.
builder.Services.AddSignalR();

// Configura o AppDbContext com PostgreSQL (Aiven).
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Registra o serviço de autenticação (Scoped: uma instância por request).
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPasswordHasher<User>>(_ => new PasswordHasher<User>());

// Registra o serviço de posts (Scoped: uma instância por request).
builder.Services.AddScoped<IPostService, PostService>();

// Registra o serviço de votos (Scoped: uma instância por request).
builder.Services.AddScoped<IVoteService, VoteService>();

// HttpClient nomeado usado pelo PostService para o webhook do bot Bostossauro.
builder.Services.AddHttpClient("BostossauroWebhook")
    .ConfigureHttpClient(client => client.Timeout = TimeSpan.FromSeconds(10));

// Configura a autenticação via JWT Bearer (valida Issuer, Audience e a chave de assinatura).
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("A configuração 'Jwt:Secret' é obrigatória.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };

        options.Events = new JwtBearerEvents
        {
            // Navegadores não enviam o header Authorization no transporte
            // WebSocket do SignalR: aceita o token via query "access_token"
            // quando a conexão é feita no endpoint do hub.
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) &&
                    path.StartsWithSegments("/hubs/gossip"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddHostedService<AivenKeepAliveWorker>();

var app = builder.Build();

// Configure the HTTP request pipeline.

// Disponibiliza o Swagger UI para testes no navegador em ambientes
// que não sejam Produção (ex: Development/Staging).
if (!app.Environment.IsProduction())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

// Endpoint do hub SignalR para notificações em tempo real.
app.MapHub<GossipHub>("/hubs/gossip");

app.Run();

