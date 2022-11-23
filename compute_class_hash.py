from json import load

from starkware.cairo.lang.compiler.program import Program
from starkware.starknet.compiler.compile import get_entry_points_by_type
from starkware.starknet.core.os.class_hash import compute_class_hash
from starkware.starknet.services.api.contract_class import ContractClass
from starkware.starknet.testing.contract_utils import get_contract_class

with open("artifacts/Account.json", "r") as f:
    contract = load(f)

program = Program.load(data=contract["program"])

real_contract = ContractClass(
    program=program,
    entry_points_by_type=get_entry_points_by_type(program=program),
    abi=contract["abi"],
)

print(
    hex(compute_class_hash(get_contract_class(contract_class=real_contract))),
)
