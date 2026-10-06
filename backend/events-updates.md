# Integração Frontend: Feature "Edição de Eventos" 📅 (Atualizado)

Este documento detalha as mudanças definitivas nos contratos da API e os passos necessários para a equipe de frontend construir a interface de edição de eventos.

## 1. Regra de Negócio e Segurança (Arquitetura Atualizada)
A edição de eventos possui uma trava de segurança estrita no backend. A antiga validação visual pelo `AuthorName` foi descartada por motivos de segurança. Agora, o backend rastreia o verdadeiro criador do evento via ID no banco de dados.
- **Quem pode editar:** Apenas usuários com perfil `Admin` ou o verdadeiro criador logado.
- **Privacidade e Anonimato:** O frontend **nunca** recebe o ID do criador. O backend envia apenas a flag `canEdit: boolean` já resolvida. O frontend deve confiar cegamente nesse booleano para liberar a interface.

## 2. Atualização dos Schemas (Zod) e Contratos
Os contratos no `src/types/index.ts` estão prontos e não mudaram na refatoração de segurança.

```typescript
// O schema de leitura de eventos inclui a flag resolvida de permissão
export type EventResponse = {
  // ... campos existentes
  canEdit: boolean; 
};

// O schema para envio da edição
export const updateEventSchema = z.object({
  name: z.string().min(3).max(120),
  date: z.string(), // Formato estrito YYYY-MM-DD
  location: z.string().max(120).optional()
});
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
```

*Atenção à Data:* O backend utiliza o tipo `DateOnly` no C#. O envio do campo `date` deve ser feito estritamente no formato `"YYYY-MM-DD"` para evitar bugs de conversão de fuso horário. O envio sem local (`location` vazio) acionará o fallback "local em segredo" no backend.

## 3. Novo Endpoint e Hooks
O serviço de mutação já foi configurado e está disponível via React Query (`src/hooks/useEvents.ts`).

- **Endpoint:** `PUT /api/events/{id}`
- **Hook Disponível:** `useUpdateEvent(month)`
- **Erros Mapeados:**
  - `400 Bad Request`: Falha na validação dos campos.
  - `403 Forbidden`: O usuário tentou forçar um PUT via rede sem ser Admin ou o real dono do evento.
  - `404 Not Found`: Evento excluído ou inexistente.

## 4. Fluxo de UI / UX a ser construído
A equipe de interface deve implementar a parte visual seguindo este roteiro:

1. **Condicional do Botão Editar:** No card ou na página de detalhes do evento, renderize o botão/ícone de "Editar" **apenas se** `event.canEdit === true`.
2. **Modal / Formulário:** Ao clicar em Editar, abra um modal preenchido com os dados atuais do evento (Nome, Data e Local).
3. **Submissão:** Dispare a edição utilizando o hook `useUpdateEvent`.
4. **Tratamento de Sucesso:** Feche o modal e exiba um toast de sucesso. O hook já invalida o cache do mês correspondente e força o *refetch*, atualizando a tela automaticamente.
5. **Tratamento de Erro:** Capture retornos `400` ou `403` e exiba alertas amigáveis caso a validação falhe.