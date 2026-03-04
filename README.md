# Barbearia - App de Agendamento

Aplicativo web para gerenciar agendamentos de barbearia com área de administração e painel para clientes.

## Funcionalidades

- Agendamento com data, horário, barbeiro e múltiplas pessoas.
- Cada pessoa pode selecionar vários serviços.
- **Cálculo automático de valores**:
  - subtotal;
  - desconto da promoção;
  - total final.
- Área de administração:
  - adicionar/excluir barbeiros;
  - criar/excluir promoções.
- Painel do cliente:
  - visualização de promoções ativas;
  - badge de novas promoções;
  - notificações (toast + navegador, quando permitido).
- Persistência local com `localStorage`.

## Preços base dos serviços

- Corte: R$ 45,00
- Barba: R$ 35,00
- Sobrancelha: R$ 20,00
- Pigmentação: R$ 60,00

## Como as informações são salvas

- O app salva tudo no navegador do usuário, usando `localStorage`.
- Chave principal: `barbearia-app-state` (barbeiros, promoções e agendamentos).
- Chave de leitura de promoções: `barbearia-seen-promotions`.
- Isso permite recarregar a página sem perder dados no mesmo navegador/dispositivo.

## Como o calendário foi usado

- O campo de agendamento usa `input type="date"` (calendário nativo do navegador).
- O campo de validade da promoção também usa `input type="date"`.
- O app configura data mínima como **hoje** para evitar selecionar datas passadas.

## Como executar

```bash
python3 -m http.server 4173
```

Acesse `http://localhost:4173`.

## Fluxo do app

1. Admin cadastra barbeiros e promoções.
2. Cliente visualiza promoções no painel do cliente e pode ativar notificações.
3. No novo agendamento, o usuário escolhe serviços para uma ou mais pessoas.
4. O sistema calcula automaticamente subtotal, desconto e total final.
5. Ao salvar, o valor final fica registrado na agenda.
