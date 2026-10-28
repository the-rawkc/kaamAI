import json
import re
from typing import Any, Dict, List, Optional
from .ai_provider import AiProvider, ChatMessage, ChatOptions
from .ai_factory import get_ai_provider
from .business_tools import business_tools_service
from ..models.agent import update_agent_run

ALLOWED_TOOLS = {"sales_totals", "top_products", "invoice_list", "overdue_totals"}


class AgentOrchestrator:
    def __init__(
        self,
        adapter: Optional[AiProvider] = None,
        max_steps: int = 5,
        timeout_ms: int = 60000,
    ):
        self._adapter = adapter
        self.max_steps = min(max(1, max_steps), 5)
        self.timeout_ms = timeout_ms

    @property
    def adapter(self) -> AiProvider:
        if self._adapter is None:
            self._adapter = get_ai_provider()
        return self._adapter

    def execute_tool(
        self, tool_name: str, workspace_id: str, args: Dict[str, Any]
    ) -> Any:
        if tool_name not in ALLOWED_TOOLS:
            raise ValueError(f"Tool {tool_name} is not allowlisted.")

        if tool_name == "sales_totals":
            return business_tools_service.sales_totals(
                workspace_id,
                amount_field=args.get("amountField", "amount"),
                date_range=args.get("dateRange"),
            )
        elif tool_name == "top_products":
            return business_tools_service.top_products(
                workspace_id,
                product_field=args.get("productField", "product"),
                amount_field=args.get("amountField", "amount"),
                date_range=args.get("dateRange"),
                limit=args.get("limit", 10),
            )
        elif tool_name == "invoice_list":
            return business_tools_service.invoice_list(
                workspace_id,
                status_filter=args.get("statusFilter"),
                date_range=args.get("dateRange"),
            )
        elif tool_name == "overdue_totals":
            return business_tools_service.overdue_totals(
                workspace_id,
                as_of_date=args.get("asOfDate"),
            )
        raise ValueError(f"Unknown tool: {tool_name}")

    async def run(
        self,
        run_id: str,
        workspace_id: str,
        message: str,
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        system_instruction = (
            "You are an intelligent business operations agent with access to database tools.\n"
            "Available tools:\n"
            "1. sales_totals(amountField, dateRange)\n"
            "2. top_products(productField, amountField, limit)\n"
            "3. invoice_list(statusFilter, dateRange)\n"
            "4. overdue_totals(asOfDate)\n\n"
            "If you need information, you can call a tool by formatting your response as:\n"
            "TOOL: tool_name\n"
            'ARGS: {"key": "val"}\n\n'
            "If you have enough information to answer the user directly, reply normally without TOOL:."
        )

        history: List[ChatMessage] = [
            ChatMessage(role="system", content=system_instruction),
            ChatMessage(role="user", content=message),
        ]

        steps: List[Dict[str, Any]] = []
        final_answer = ""

        for step_idx in range(1, self.max_steps + 1):
            chat_res = await self.adapter.chat(
                history,
                ChatOptions(model=model, temperature=0.2, timeout_ms=self.timeout_ms),
            )
            content = chat_res.content.strip()

            tool_match = re.search(r"TOOL:\s*(\w+)", content)
            if tool_match and tool_match.group(1) in ALLOWED_TOOLS:
                tool_name = tool_match.group(1)
                args: Dict[str, Any] = {}
                args_match = re.search(r"ARGS:\s*({.*})", content, re.DOTALL)
                if args_match:
                    try:
                        args = json.loads(args_match.group(1))
                    except Exception:
                        pass

                step_record = {
                    "step": step_idx,
                    "tool": tool_name,
                    "input": args,
                    "status": "running",
                }
                steps.append(step_record)

                try:
                    tool_output = self.execute_tool(tool_name, workspace_id, args)
                    step_record["output"] = tool_output
                    step_record["status"] = "completed"
                    history.append(ChatMessage(role="assistant", content=content))
                    history.append(
                        ChatMessage(
                            role="user",
                            content=f"Tool {tool_name} returned result: {json.dumps(tool_output)}",
                        )
                    )
                except Exception as err:
                    step_record["status"] = "error"
                    step_record["error"] = str(err)
                    history.append(
                        ChatMessage(
                            role="user",
                            content=f"Tool {tool_name} failed with error: {err}",
                        )
                    )
            else:
                final_answer = content
                break

        if not final_answer and steps:
            final_answer = "Analysis completed based on the retrieved records."

        update_agent_run(
            run_id,
            status="completed",
            steps=steps,
            final_answer=final_answer,
        )

        return {
            "run_id": run_id,
            "status": "completed",
            "steps": steps,
            "final_answer": final_answer,
        }
